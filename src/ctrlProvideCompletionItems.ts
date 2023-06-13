import * as vscode from 'vscode';
import { CtrlSymbolsCreator } from './ctrlSymbolsCreator';

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
    public SetClassMembers(childSymbol: vscode.DocumentSymbol) {
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
		let complet = new vscode.CompletionItem({label: childSymbol.name, detail: ' ' +childSymbol.detail}, complKind);
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
    
}