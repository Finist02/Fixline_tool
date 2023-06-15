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
            let completVar = new vscode.CompletionItem({label: variables.name, detail: ' ' +variables.detail}, vscode.CompletionItemKind.Variable);
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
		let complet = new vscode.CompletionItem({label: childSymbol.name, detail: ' ' +childSymbol.detail + basName}, complKind);
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
	private GetUsesCompletionItems(document: vscode.TextDocument, baseClass: string = '') {
		for (let i = 0; i < document.lineCount; i++) {
            let lineText = document.lineAt(i).text;
            if(lineText.startsWith('//')) continue;
			let regexp = /#uses\s+"(?<library>.*)"/;
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
										this.provideCompletionItemsCtrl.SetClassMembers(childSymbol, ' : '+ baseClass);
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
							this.GetUsesCompletionItems(document, resRegex[1]);
						}
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