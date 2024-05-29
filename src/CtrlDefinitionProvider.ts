import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlSymbolsCreator, TypeQuery } from './ctrlSymbolsCreator';
import { GetProjectsInConfigFile } from './ctrlComands';

export class CtrlDefinitionProvider implements vscode.DefinitionProvider {
	private GetUsesProvider(document: vscode.TextDocument, textUnderCursor: string, parentType: string): vscode.Location | undefined {
		let location = undefined;
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
						let uri = vscode.Uri.file(pathScript);
						let fileData = fs.readFileSync(pathScript, 'utf8');
						let ctrlSymbolsCreator = new CtrlSymbolsCreator(fileData, TypeQuery.protectedSymbols);
						let symbols = ctrlSymbolsCreator.GetSymbols();
						for(let i = 0; i < symbols.length; i++) {
							let symbol = symbols[i];
							if(parentType != '' && symbol.name == parentType) {
								for(let j = 0; j < symbol.children.length; j++) {
									if(symbol.children[j].name == textUnderCursor) {
										location =  new vscode.Location(uri, symbol.children[j].selectionRange);
										break;
									}
								}
							}
							else if(symbol.name == textUnderCursor) {
								location =  new vscode.Location(uri, symbol.selectionRange);
								break;
							}
						}
					}
				})
        	}
		}
		return location;
	}
    public provideDefinition(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        undefined | vscode.Location {
			let textLine = document.lineAt(position.line).text;
			let location = undefined;
			let regexp = /#uses\s+"(?<library>.*?)(?:\.ctl)?"/;
			let result = regexp.exec(textLine);
			//переход к библиотеке если выбрана строка #uses
			if(result?.groups) {
				let library = result.groups['library'];
				let paths = GetProjectsInConfigFile();
				paths.forEach(path => {
					if(fs.existsSync(path+'/scripts/libs/'+library+'.ctl')) {
						let pathScript = path+'/scripts/libs/'+library+'.ctl';
						let uri = vscode.Uri.file(pathScript);
						let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
						location =  new vscode.Location(uri, range);
						return location;
					}
				});
			}
			//поиск в самом классе//функции
			else {
				let range = document.getWordRangeAtPosition(position);
				let textUnderCursor = document.getText(range);
				let varBefore = '';
				let typeVarBeforeDot = '';
				if(range) {
					let prevCursorCharRange = new vscode.Range(new vscode.Position(range.start.line, range.start.character-1), new vscode.Position(range.start.line, range.start.character));
					let prevText = document.getText(prevCursorCharRange);
					if(prevText == '.') {
						let textLine = document.lineAt(range.start.line).text;
						let regex = RegExp('(\\w+)\\.' + textUnderCursor);
						let match = regex.exec(textLine);
						if(match && match[1] != 'this') {
							varBefore = match[1];
						}

					}
					if(prevText == ':') {
						let textLine = document.lineAt(range.start.line).text;
						let regex = RegExp('(\\w+)\\::' + textUnderCursor);
						let match = regex.exec(textLine);
						if(match && match[1] != 'this') {
							typeVarBeforeDot = match[1];
						}

					}
				}
				let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
				let symbols = ctrlSymbolsCreator.GetSymbols();
				//класс или функция
				for(let i = 0; i < symbols.length; i++) {
					let symbol = symbols[i];
					if(symbol.name == textUnderCursor) {
						location =  new vscode.Location(document.uri, symbol.selectionRange);
						return location;
					}
					if(symbol.range.contains(position)) {
						//метод или переменная в функции
						for(let j = 0; j < symbol.children.length; j++) {
							let childSymbol = symbol.children[j];
							if(childSymbol.name == textUnderCursor && varBefore == '') {
								location =  new vscode.Location(document.uri, childSymbol.selectionRange);
								return location;
							}
							if(varBefore != '' && childSymbol.name == varBefore) {
								typeVarBeforeDot = childSymbol.detail;
								let regex = /shared_ptr\s*<\s*(\w+)\s*>/;
								let match = regex.exec(typeVarBeforeDot);
								if(match && match[1] != 'this') {
									typeVarBeforeDot = match[1];
								}
							}
							//переменные в методе
							if(childSymbol.range.contains(position)) {
								for(let k = 0; k < childSymbol.children.length; k++) {
									let varSymbol = childSymbol.children[k];
									if(varBefore != '' && varSymbol.name == varBefore) {
										typeVarBeforeDot = varSymbol.detail;
										let regex = /shared_ptr\s*<\s*(\w+)\s*>/;
										let match = regex.exec(typeVarBeforeDot);
										if(match && match[1] != 'this') {
											typeVarBeforeDot = match[1];
										}
									}
									if(varSymbol.name == textUnderCursor) {
										location =  new vscode.Location(document.uri, varSymbol.selectionRange);
										return location;
									}
								}
							}					
						}
						//поиск в классе родителе
						let regex = /:\s*([a-zA-Z_]\w+)/;
						let resRegex = regex.exec(symbol.detail);
						if(resRegex) {
							let useLocation = this.GetUsesProvider(document, textUnderCursor, resRegex[1]);
							if(useLocation) {
								return useLocation;
							}
						}
					}
				}
				//поиск в самом файле в другом классе или структуре если вызван член класса
				if(typeVarBeforeDot != '') {
					for(let i = 0; i < symbols.length; i++) {
						let symbol = symbols[i];
						if(symbol.name == typeVarBeforeDot) {
							for(let j = 0; j < symbol.children.length; j++) {
								if(symbol.children[j].name == textUnderCursor) {
									location =  new vscode.Location(document.uri, symbol.children[j].selectionRange);
									return location;
								}
							}
						}
					}
				}
				//поиск в uses
				let useLocation = this.GetUsesProvider(document, textUnderCursor, typeVarBeforeDot);
				if(useLocation) {
					return useLocation;
				}
			}
			return location;
    }
}