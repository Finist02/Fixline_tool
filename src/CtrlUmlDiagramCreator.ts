import * as cmdCtrl from './CtrlComands';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { QuickPickItem } from 'vscode';
import { CtrlSymbolsCreator, TextSplitter, TypeQuery } from './ctrlSymbolsCreator';
var xml2js = require('xml2js');

export async function CreateUMLDiagrams() {
	let projectsFolders = cmdCtrl.GetProjectsInConfigFile(false);
	let items: QuickPickItem[] = [];
	projectsFolders.forEach(path => {
		let splittedPath  = path.split('/');
		items.push({
			label: splittedPath[splittedPath.length-1],
			description: path
		});
	})
	const selectedSubProj = await vscode.window.showQuickPick(items);
	if(selectedSubProj == undefined) return;
	const foldersInSubProjectClasses = cmdCtrl.GetDirectories(selectedSubProj.description + '/scripts/libs/classes');
	
	let items1: QuickPickItem[] = [];
	items1.push({
		label: 'all',
		description: selectedSubProj.description + '/scripts/libs/classes/'
	});
	foldersInSubProjectClasses.forEach(path => {
		items1.push({
			label: path,
			description: selectedSubProj.description + '/scripts/libs/classes/' + path
		});
	})
	const pathCreateUML = await vscode.window.showQuickPick(items1);
	if(pathCreateUML == undefined) return;
	if(pathCreateUML.description == undefined) return;
	const pathsScript = cmdCtrl.ThroughFiles(pathCreateUML.description);
	let structFolders = {};
	let creator = new DrawIoCreator();
	pathsScript.forEach(pathScript => {
		let fileEndPath = pathScript.replace(pathCreateUML.description?.replace(/\//g, '\\') + '\\scripts\\libs\\classes\\', '');
		let uri = vscode.Uri.file(pathScript);
		let fileData = fs.readFileSync(pathScript, 'utf8');
		let ctrlSymbolsCreator = new CtrlSymbolsCreator(fileData, TypeQuery.allSymbols);
		let symbols = ctrlSymbolsCreator.GetSymbols();
		const textSplitter = new TextSplitter(fileData);
		creator.SetTextSplitter(textSplitter);
		creator.AddSymbols(symbols);
	});
	let drawIoData = creator.GetDocument();
	const writeBytes = Buffer.from(drawIoData);
	let uriFile = vscode.Uri.parse("file:" + selectedSubProj.description + '/' + pathCreateUML.label + '.drawio');
	vscode.workspace.fs.writeFile(uriFile, writeBytes).then(() => {
		vscode.workspace.openTextDocument(uriFile).then((a: vscode.TextDocument) => {
			vscode.window.showTextDocument(a, 1, true)
		})
	});
}

interface  nodeCell {
	id: string;
	parent?: string;
	vertex?: string;
	value?: string;
	style?:string;
};
interface  mxGeometry {
	$: { 
		x?: string;
		y: string;
		width: string;
		height: string;
		as: string;
	}
};


interface  mxCell {
	$: nodeCell;
	mxGeometry?: mxGeometry;
};

class DrawIoCreator {
	private id = 2;
	private posX = 30;
	private posY = 30;
	private maxCurrentY = this.posY;
	private textSplitter: TextSplitter | undefined;
	private fields: string[] = new Array;
	private methods: string[] = new Array;
	private cellArray : mxCell[] = [{$: {id: "0"}},	{$: {id: "1", parent: "0"}}];
	private drawDoc = {
		mxfile: {
			$: {
				host: "65bd71144e"
			},
			diagram: {
				$: {
					id: "VyzYvN410ULQ9_JlEYPt",
					name : "Page-1"
				},
				mxGraphModel: {
					$: {
						dx: "1267",
						dy : "1304",
						grid : "1",
						gridSize : "10",
						guides : "1",
						tooltips : "1",
						connect : "1",
						arrows : "1",
						fold : "1",
						page : "1",
						pageScale : "1",
						pageWidth : "850",
						pageHeight : "1100",
						math : "0",
						shadow : "0",
					},
					root: {
						mxCell: this.cellArray
					}												
				}					
			}
		}
	};
	
	public SetTextSplitter(textSplitter: TextSplitter) {
		this.textSplitter = textSplitter;
	}

	public AddSymbols(symbols: vscode.DocumentSymbol[])	{
		symbols.forEach(symbol =>{
			if(symbol.kind == vscode.SymbolKind.Class) {
				this.FillArraysTerms(symbol);
				this.FillClass(symbol.name);
				this.ClearArraysTerms();
			}
		})
	}

	public GetDocument() {
		let builder = new xml2js.Builder({headless : true});
		let xml = builder.buildObject(this.drawDoc);
		return xml;
	}

	private FillArraysTerms(symbol : vscode.DocumentSymbol) {
		symbol.children.forEach(child => {
			if(this.textSplitter == undefined) return;
			const symbolText = this.textSplitter.getText(child.range).trimStart();
			const preffix = symbolText.startsWith('public') ? '+ ' : '- ';
			if(child.kind == vscode.SymbolKind.Field || child.kind == vscode.SymbolKind.Constant) {
				this.fields.push(preffix + child.name + ': ' + child.detail);
			}
			else {
				const textMethod = this.textSplitter.getText(child.range);
				const signatureMethod = textMethod.match(/(.*?){/s);
				if(signatureMethod != undefined && signatureMethod[1] != undefined) {
					const innerParameters = signatureMethod[1].match(/\(.*\)/);
					if(innerParameters != undefined && innerParameters[0] != undefined) {
						this.methods.push(preffix + child.name + innerParameters[0] + ': ' + child.detail);
					}
					else {
						this.methods.push(preffix + child.name + '(): ' + child.detail);
					}
				}
			}
		});
	}
	private ClearArraysTerms() {
		this.methods = [];
		this.fields = [];
	}
	
	private FillClass(className: string) {
		this.id++;
		const widthBlock = this.GetWidthBlock(className);
		this.PushClassBlock(className, widthBlock);
		let idNodeMember = this.id;
		let posYMember = 26;
		const newVars = this.PushFields(idNodeMember, posYMember, widthBlock);
		posYMember = newVars.yPos;
		idNodeMember = newVars.id;
		idNodeMember++;
		this.PushDivideLine(idNodeMember, posYMember, widthBlock);
		posYMember += 8;
		const newVars1 = this.PushMethods(idNodeMember, posYMember, widthBlock);
		posYMember = newVars1.yPos;
		idNodeMember = newVars1.id;
		this.id = idNodeMember;
		this.id++
		this.posX += widthBlock + 20;
		if(this.maxCurrentY < posYMember) {
			this.maxCurrentY = posYMember;
		}
		if(this.posX > 1470) {
			this.posX = 30;
			this.posY += this.maxCurrentY + 52;
			this.maxCurrentY = 30;
		}
	}
	
	private GetWidthBlock(className: string) {
		let arrayTerms = [...this.methods, ...this.fields, 'class ' + className];
		const lenghtLongestMember = arrayTerms.sort((a, b) => b.length - a.length)[0].length;
		return lenghtLongestMember * 5.5;
	}

	private GetHeightClass() {
		const countFieldsInDiagram = this.fields.length == 0 ? 1 : this.fields.length;
		const countMethodsInDiagram = this.methods.length == 0 ? 1 : this.methods.length;
		return (countMethodsInDiagram + countFieldsInDiagram + 1) * 26 + 8;
	}

	private PushClassBlock(className: string, widthBlock: number) {
		const heightClass = this.GetHeightClass();
		const valueTextClass = 'class ' + className;
		this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push(
			{
				$: {
					id: this.id.toString(),
					parent: "1",
					vertex: "1",
					value:	valueTextClass,
					style: 'swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;'
				},
				mxGeometry: {
					$: { 
						x: this.posX.toString(),
						y: this.posY.toString(),
						width: widthBlock.toString(),
						height: heightClass.toString(),
						as: "geometry" 
					}
				} 
			}
		);
	}

	private PushFields(idNodeMember: number, posYMember: number, widthBlock: number) {
		if(this.fields.length == 0) {
			idNodeMember++;
			this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push({
				$: {
					id: idNodeMember.toString(),
					parent: this.id.toString(),
					vertex: "1",
					value:	"",
					style: 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
				},
				mxGeometry: {
					$: { 
						y: posYMember.toString(),
						width: widthBlock.toString(),
						height: "26",
						as: "geometry" 
			}}});
			posYMember += 26;
		}
		else {
			this.fields.forEach(field => {
				idNodeMember++;
				this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push({
					$: {
						id: idNodeMember.toString(),
						parent: this.id.toString(),
						vertex: "1",
						value:	field,
						style: 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
					},
					mxGeometry: {
						$: { 
							y: posYMember.toString(),
							width: widthBlock.toString(),
							height: "26",
							as: "geometry" 
				}}});
				posYMember += 26;
			});
		}
		return {id: idNodeMember, yPos: posYMember}
	}

	private PushDivideLine(idNodeMember: number, posYMember: number, widthBlock: number) {
		this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push(
			{
				$: {
					id: idNodeMember.toString(),
					parent: this.id.toString(),
					vertex: "1",
					value:	"",
					style: 'line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];portConstraint=eastwest;strokeColor=inherit;'
				},
				mxGeometry: {
					$: { 
						y: posYMember.toString(),
						width: widthBlock.toString(),
						height: "8",
						as: "geometry" 
					}
				} 
			}
		);
	}

	private PushMethods(idNodeMember: number, posYMember: number, widthBlock: number) {
		if(this.methods.length == 0) {
			idNodeMember++;
			this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push({
				$: {
					id: idNodeMember.toString(),
					parent: this.id.toString(),
					vertex: "1",
					value:	"",
					style: 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
				},
				mxGeometry: {
					$: { 
						y: posYMember.toString(),
						width: widthBlock.toString(),
						height: "26",
						as: "geometry" 
			}}});
			posYMember += 26;
		}
		else {
			this.methods.forEach(method => {
				idNodeMember++;
				this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push({
					$: {
						id: idNodeMember.toString(),
						parent: this.id.toString(),
						vertex: "1",
						value:	method,
						style: 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
					},
					mxGeometry: {
						$: { 
							y: posYMember.toString(),
							width: widthBlock.toString(),
							height: "26",
							as: "geometry" 
				}}});
				posYMember += 26;
			});
		}
		return {id: idNodeMember, yPos: posYMember}
	}
}

