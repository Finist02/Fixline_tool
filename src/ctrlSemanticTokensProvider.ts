import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlSymbolsCreator, TextSplitter, TypeQuery } from './ctrlSymbolsCreator';
import { GetProjectsInConfigFile } from './ctrlComands';
export const tokenTypes = ['class', 'interface', 'enum', 'function', 'variable', "enumMember"];
export const tokenModifiers = ['declaration', 'documentation'];
export const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);
export class CtrlSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
	private GetUsesTokens(document: vscode.TextDocument): Array<vscode.DocumentSymbol[]> | undefined {
		let tokensSymbol = new Array;
		for (let i = 0; i < document.lineCount; i++) {
            let lineText = document.lineAt(i).text;
            if(lineText.startsWith('//')) continue;
			let regexp = /#uses\s+"(?<library>.*?)(?:\.ctl)?"/;
			let result = regexp.exec(document.lineAt(i).text);
			if(result?.groups) {
				let library = result.groups['library'];
				let paths = GetProjectsInConfigFile();
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
			textSplitter.deleteComment();
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
					let indexClassName = lineText.indexOf(symbol.name, result.index);
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
					let regExp = new RegExp('\\.' + symbolChild.name + '\\b','g');
					let regExpDefeinition = new RegExp(symbolChild.detail + '\\s+(' + symbolChild.name + ')\\b','g');
					let inParentPosition = true;
					//для энумов только после :: или в самом объявлении
					if(symbolChild.kind == vscode.SymbolKind.EnumMember) {
						regExp = new RegExp('\\::' + symbolChild.name + '\\b','g');
						regExpDefeinition = new RegExp('\\s*(' + symbolChild.name + ')\\b','g');
						if(!symbol.range.contains(new vscode.Position(i, 0))) {
							inParentPosition = false;
						}
					}
					const result = regExp.exec(lineText);
					const result1 = regExpDefeinition.exec(lineText);
					if(result) {
						let indexClassName = lineText.indexOf(symbolChild.name, result.index);
						if(indexClassName >= 0) {
							tokensBuilder.push(
								new vscode.Range(new vscode.Position(i, indexClassName), new vscode.Position(i, indexClassName + symbolChild.name.length)),
								'enumMember',
								['declaration']
							)
						}
					}
					else if(result1 && inParentPosition) {
						let indexClassName = lineText.indexOf(symbolChild.name, result1.index);
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