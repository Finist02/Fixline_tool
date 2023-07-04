import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlSymbolsCreator, TextSplitter, TypeQuery } from './ctrlSymbolsCreator';
export const tokenTypes = ['class', 'interface', 'enum', 'function', 'variable', "enumMember"];
export const tokenModifiers = ['declaration', 'documentation'];
export const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
export class CtrlSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
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
	private GetUsesTokens(document: vscode.TextDocument): Array<vscode.DocumentSymbol[]> | undefined {
		let tokensSymbol = new Array;
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
						let fileData = fs.readFileSync(pathScript, 'utf8');
						let ctrlSymbolsCreator = new CtrlSymbolsCreator(fileData, TypeQuery.protectedSymbols);
						let symbols = ctrlSymbolsCreator.GetSymbols();
						tokensSymbol.push(symbols);
					}
				})
        	}
		}
		return tokensSymbol;
	}
    public provideDocumentSemanticTokens(
        document: vscode.TextDocument
		): vscode.ProviderResult<vscode.SemanticTokens> {
			let textSplitter = new TextSplitter(document.getText());
			const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
			let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
			let symbols = ctrlSymbolsCreator.GetSymbols();
			const usesSymbols = this.GetUsesTokens(document);
			//проверка в юсес
			if(usesSymbols){
				usesSymbols.forEach(usesSymbol => {
					usesSymbol.forEach(symbol => {
						this.GetBuilder(symbol, textSplitter, tokensBuilder);
				});
			});
		}
		//своя
		symbols.forEach(symbol => {
			this.GetBuilder(symbol, textSplitter, tokensBuilder);
		});
        return tokensBuilder.build();
      }
	  private GetBuilder(symbol: vscode.DocumentSymbol, textSplitter: TextSplitter, tokensBuilder:vscode.SemanticTokensBuilder)
	  {
		if(symbol.kind == vscode.SymbolKind.Class 
			|| symbol.kind == vscode.SymbolKind.Struct 
			|| symbol.kind == vscode.SymbolKind.Enum 
			|| symbol.kind == vscode.SymbolKind.Constant) {
			for(let i = 0; i < textSplitter.lineCount; i++) {
				const lineText = textSplitter.getTextLineAt(i);
				if(lineText.startsWith('#')) continue;
				const regExp = new RegExp('\\b' + symbol.name + '\\b','g');
				const result = regExp.exec(lineText);
				if(result) {
					let indexClassName = lineText.indexOf(symbol.name);
					if(indexClassName >= 0) {
						if(symbol.kind == vscode.SymbolKind.Constant) {
							tokensBuilder.push(
								new vscode.Range(new vscode.Position(i, indexClassName), new vscode.Position(i, indexClassName + symbol.name.length)),
								'enumMember',
								['declaration']
							)
						}
						else {
							tokensBuilder.push(
								new vscode.Range(new vscode.Position(i, indexClassName), new vscode.Position(i, indexClassName + symbol.name.length)),
								'class',
								['declaration']
							);
						}
						
		}}}}
		symbol.children.forEach(symbolChild =>{
			if(symbolChild.kind == vscode.SymbolKind.Constant || symbolChild.kind == vscode.SymbolKind.EnumMember) {
				for(let i = 0; i < textSplitter.lineCount; i++) {
					const lineText = textSplitter.getTextLineAt(i);
					if(lineText.startsWith('#')) continue;
					const regExp = new RegExp('\\b' + symbolChild.name + '\\b','g');
					const result = regExp.exec(lineText);
					if(result) {
						let indexClassName = lineText.indexOf(symbolChild.name);
						if(indexClassName >= 0) {
							tokensBuilder.push(
								new vscode.Range(new vscode.Position(i, indexClassName), new vscode.Position(i, indexClassName + symbolChild.name.length)),
								'enumMember',
								['declaration']
							)
						}
					}
				}
			}
		});
		return tokensBuilder;
	  }
}