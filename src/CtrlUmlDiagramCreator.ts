import * as cmdCtrl from './ctrlComands';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { QuickPickItem } from 'vscode';
import { CtrlSymbolsCreator, TypeQuery } from './ctrlSymbolsCreator';
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
	const pathCreateUML = await vscode.window.showQuickPick(items);
	if(pathCreateUML == undefined) return;
	const pathsScript = cmdCtrl.ThroughFiles(pathCreateUML.description + '/scripts/libs/classes');
    let structFolders = {};
	let creator = new DrawIoCreator();
	pathsScript.forEach(pathScript => {
        let fileEndPath = pathScript.replace(pathCreateUML.description?.replace(/\//g, '\\') + '\\scripts\\libs\\classes\\', '');
        let uri = vscode.Uri.file(pathScript);
        let fileData = fs.readFileSync(pathScript, 'utf8');
        let ctrlSymbolsCreator = new CtrlSymbolsCreator(fileData, TypeQuery.allSymbols);
        let symbols = ctrlSymbolsCreator.GetSymbols();
		creator.AddSymbols(symbols);
    });
	let drawIoData = creator.GetDocument();
	const writeBytes = Buffer.from(drawIoData);
	let uriFile = vscode.Uri.parse("file:" + pathCreateUML.description + '/file.drawio');
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
	
	public AddSymbols(symbols: vscode.DocumentSymbol[])
	{
		symbols.forEach(symbol =>{
			if(symbol.kind == vscode.SymbolKind.Class) {
				console.log(symbol);
				this.PushClass(symbol);
			}			
		})
	}
	public GetDocument() {
		let builder = new xml2js.Builder({headless : true});
		let xml = builder.buildObject(this.drawDoc);
		return xml;
	}

	private PushClass(classSymbol: vscode.DocumentSymbol)
	{
		this.id++;
		const valueText = 'class ' + classSymbol.name;
		const widthBlock = valueText.length * 8 + 30;
		this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push(
			{
				$: {
					id: this.id.toString(),
					parent: "1",
					vertex: "1",
					value:	valueText,
					style: 'swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;'
				},
				mxGeometry: {
					$: { 
						x: this.posX.toString(),
						y: this.posY.toString(),
						width: widthBlock.toString(),
						height: "90",
						as: "geometry" 
					}
				} 
			}
		);
		let idNodeMember = this.id;
		let posYMember = 26;
		classSymbol.children.forEach(child => {
			if(child.kind != vscode.SymbolKind.Method) {
				const isPublic = child.detail.startsWith('public');
				idNodeMember++;
				const returnType = child.detail.split(' ')[1];
				this.PushMember(idNodeMember.toString(), isPublic, child.name, returnType, posYMember)
				posYMember += 26;

		}});
		idNodeMember++;
		this.PushDivedeLine(idNodeMember.toString());
		classSymbol.children.forEach(child => {
			if(child.kind == vscode.SymbolKind.Method) {
				const isPublic = child.detail.startsWith('public');
				idNodeMember++;
				const returnType = child.detail.split(' ')[1];
				this.PushMember(idNodeMember.toString(), isPublic, child.name + '()', returnType, posYMember)
				posYMember += 26;

		}});
		this.id = idNodeMember;
		this.id++
		this.posX += widthBlock + 20;
		if(this.posX > 1470) {
			this.posX = 30;
			this.posY += 160;
		}
	}

	private PushMember(idNode: string, isPublic: boolean, memberName: string, typeName: string, posYMember: number)
	{
		const memberPrefix = isPublic ? '+ ' : '- ';
		this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push({
			$: {
				id: idNode,
				parent: this.id.toString(),
				vertex: "1",
				value:	memberPrefix + memberName + ': ' + typeName,
				style: 'text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;'
			},
			mxGeometry: {
				$: { 
					y: posYMember.toString(),
					width: "160",
					height: "26",
					as: "geometry" 
		}}});
	}

	private PushDivedeLine(idNode: string)
	{
		this.drawDoc.mxfile.diagram.mxGraphModel.root.mxCell.push(
			{
				$: {
					id: idNode,
					parent: this.id.toString(),
					vertex: "1",
					value:	"",
					style: 'line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];portConstraint=eastwest;strokeColor=inherit;'
				},
				mxGeometry: {
					$: { 
						y: this.posY.toString(),
						width: "160",
						height: "8",
						as: "geometry" 
					}
				} 
			}
		);
		this.posY += 8;
	}

}

