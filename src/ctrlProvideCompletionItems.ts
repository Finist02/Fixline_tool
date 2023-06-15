import * as vscode from 'vscode';
import { CtrlSymbolsCreator } from './ctrlSymbolsCreator';
import * as fs from 'fs';



export class ProvideCompletionItemsCtrl {
	private  completions = new Array();
	public GetSymbols() {        
		return this.completions;
	}
	private SetSymbolsCompletionFunction(symbol: vscode.DocumentSymbol) {
		for(let j = 0; j < symbol.children.length; j++) {
			let variables = symbol.children[j];
			let regex = /shared_ptr\s*<\s*(\w+)\s*>/;
			let detail = variables.detail;
			let match = regex.exec(detail);
			if(match && match[1]) {
				detail = match[1];
			}
			let completVar = new vscode.CompletionItem({label: variables.name, detail: ' ' +detail}, vscode.CompletionItemKind.Variable);
			this.completions.push(completVar);
		}
	}
	public SetClassMembers(childSymbol: vscode.DocumentSymbol, basName: string = '') {
		let kind = childSymbol.kind;
		let complKind;
		let isFunction = true;
		if(kind == vscode.SymbolKind.Method) {
			complKind = vscode.CompletionItemKind.Method;
		}
		if(kind == vscode.SymbolKind.Field) {
			complKind = vscode.CompletionItemKind.Field;
			isFunction =false;
		}
		if(kind == vscode.SymbolKind.Constant) {
			complKind = vscode.CompletionItemKind.Constant;
			isFunction =false;
		}
		if(kind == vscode.SymbolKind.Constructor) {
			complKind = vscode.CompletionItemKind.Constructor;
		}
		let regex = /shared_ptr\s*<\s*(\w+)\s*>/;
		let detail = childSymbol.detail;
		let match = regex.exec(detail);
		if(match && match[1]) {
			detail = match[1];
		}
		let complet = new vscode.CompletionItem({label: childSymbol.name, detail: ' ' +detail + basName}, complKind);
		if(isFunction) {
			complet.insertText = new vscode.SnippetString(childSymbol.name + '($0);');
		}
		this.completions.push(complet);
	}
	public SetCompletionClass(document: vscode.TextDocument, position: vscode.Position) {
		let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
		let symbols = ctrlSymbolsCreator.GetSymbols();
		for(let i = 0; i < symbols.length; i++) {
			let symbol = symbols[i];
			let isPositionInSymbol = symbol.range.contains(position);
			if(isPositionInSymbol && symbol.kind == vscode.SymbolKind.Class)
			{
				const thisCharacterCompletion = new vscode.CompletionItem('this');
				thisCharacterCompletion.commitCharacters = ['.'];
				thisCharacterCompletion.documentation = new vscode.MarkdownString('Press `.` to get `this.`');
				this.completions.push(thisCharacterCompletion);
				for(let j = 0; j < symbol.children.length; j++) {
					let childSymbol = symbol.children[j];
					this.SetClassMembers(childSymbol);
					if(childSymbol.range.contains(position)){
						this.SetSymbolsCompletionFunction(childSymbol);
					}	
				}
			}
			else if(isPositionInSymbol && symbol.kind == vscode.SymbolKind.Function)
			{
				this.SetSymbolsCompletionFunction(symbol);
			}
		}
	}
	public GetTypeVar(document: vscode.TextDocument, varName: string) {
		let ctrlSymbolsCreator = new CtrlSymbolsCreator(document, true);
		let symbols = ctrlSymbolsCreator.GetSymbols();
		for(let i = 0; i <= symbols.length; i++) {
			for(let j = 0; j <= symbols[i].children.length; j++) {				
				if(symbols[i].children[j].name == varName) {
					let regex = /shared_ptr\s*<\s*(\w+)\s*>/;
					let varType = symbols[i].children[j].detail;
					let match = regex.exec(varType);
					if(match && match[1]) {
						varType = match[1];
					}
					return varType;
				}
		}}
		return '';
	}
	public CheckExistingItem(name: string) {
		let isExists = false;
		this.completions.forEach(item => {
			if(item.label['label'] == name){
				isExists = true;
			}
		})
		return isExists;
	}
}

export class CtrlCompletionItemProvider implements vscode.CompletionItemProvider {
	private provideCompletionItemsCtrl: any;
	private GetProjectsInConfigFile(): string[] {
		let paths = [];
		let regexp =/proj_path = \"(.*?)\"/g;
		let workspaceFolders = vscode.workspace.workspaceFolders;
		if(workspaceFolders)
		{
			let fsPath = workspaceFolders[0].uri.fsPath;
			if (fs.existsSync(fsPath + '/config/config')) {
				let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
				let result;
				while (result = regexp.exec(fileData)) {
					paths.push(result[1])
				}
			}
		}
		return paths;
	}
	private GetUsesCompletionItems(document: vscode.TextDocument, baseClass: string = '', detail: string = '') {
		for (let i = 0; i < document.lineCount; i++) {
			let lineText = document.lineAt(i).text;
			if(lineText.startsWith('//')) continue;
			let regexp = /#uses\s+"(?<library>.*?)(?:\.ctl)?"/;
			let result = regexp.exec(document.lineAt(i).text);
			if(result?.groups) {
				let library = result.groups['library'];
				let paths = this.GetProjectsInConfigFile();
				paths.forEach(path => {
					if(fs.existsSync(path+'/scripts/libs/'+library+'.ctl')) {
						let pathScript = path+'/scripts/libs/'+library+'.ctl';
						let uri = vscode.Uri.file(pathScript);
						let fileData = fs.readFileSync(pathScript, 'utf8');
						let ctrlSymbolsCreator = new CtrlSymbolsCreator(fileData);
						let symbols = ctrlSymbolsCreator.GetSymbols();
						for(let i = 0; i < symbols.length; i++) {
							let symbol = symbols[i];
							if(baseClass != '' && symbol.name == baseClass) {
								for(let j = 0; j < symbol.children.length; j++) {
									let childSymbol = symbol.children[j];
									let isItemExists = this.provideCompletionItemsCtrl.CheckExistingItem(childSymbol.name);
									if(!isItemExists) {
										detail = detail == '' ? '' : ' : ' + detail;
										this.provideCompletionItemsCtrl.SetClassMembers(childSymbol, detail);
									}
								}
							}
							else if(baseClass == '') {
								this.provideCompletionItemsCtrl.SetClassMembers(symbol);
							}
						}
					}
				})
			}
		}
	}
	public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
		const linePrefix = document.lineAt(position).text.substr(0, position.character);
		this.provideCompletionItemsCtrl = new ProvideCompletionItemsCtrl();
		if(linePrefix.endsWith('this.')) {
			let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
			let symbols = ctrlSymbolsCreator.GetSymbols();
			for(let i = 0; i < symbols.length; i++) {
				let symbol = symbols[i];
				let isPositionInSymbol = symbol.range.contains(position);
				if(isPositionInSymbol && symbol.kind == vscode.SymbolKind.Class)
				{
					for(let j = 0; j < symbol.children.length; j++) {
						let childSymbol = symbol.children[j];
						this.provideCompletionItemsCtrl.SetClassMembers(childSymbol);
					}
					let regex = /:\s*([a-zA-Z_]\w+)/;
					let resRegex = regex.exec(symbol.detail);
					if(resRegex) {
						this.GetUsesCompletionItems(document, resRegex[1], resRegex[1]);
					}
				}
			}
		}
		else if(linePrefix.endsWith('.')) {
			let pos1 = new vscode.Position(position.line, position.character - 1);
			let range = document.getWordRangeAtPosition(pos1);
			let varBefore = document.getText(range);
			if(varBefore) {				
				let typeVar = this.provideCompletionItemsCtrl.GetTypeVar(document, varBefore);
				if(typeVar != '') {
					this.GetUsesCompletionItems(document, typeVar, '');
				}
			}
		}
		else {
			this.provideCompletionItemsCtrl.SetCompletionClass(document, position);
			this.GetUsesCompletionItems(document);
		}
		return this.provideCompletionItemsCtrl.GetSymbols();
	}
}