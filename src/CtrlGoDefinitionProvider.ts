import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlSymbolsCreator } from './ctrlSymbolsCreator';
import { url } from 'inspector';

export class CtrlGoDefinitionProvider implements vscode.DefinitionProvider {
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
	private GetUsesProvider(document: vscode.TextDocument, textUnderCursor: string, parentType: string): vscode.Location | undefined {
		let location = undefined;
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
							if(parentType != '' && symbol.name == parentType) {
								for(let j = 0; j < symbol.children.length; j++) {
									if(symbol.children[j].name == textUnderCursor) {
										location =  new vscode.Location(uri, symbol.children[j].range);
										break;
									}
								}
							}
							else if(symbol.name == textUnderCursor) {
								location =  new vscode.Location(uri, symbol.range);
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
        undefined | vscode.Location | Thenable<vscode.Location> {
			let textLine = document.lineAt(position.line).text;
			let location = undefined;
			let regexp = /#uses\s+"(?<library>.*)"/;
			let result = regexp.exec(textLine);
			if(result?.groups) {
				let library = result.groups['library'];
				let paths = this.GetProjectsInConfigFile();
				paths.forEach(path => {
					if(fs.existsSync(path+'/scripts/libs/'+library+'.ctl')) {
						let pathScript = path+'/scripts/libs/'+library+'.ctl';
						let uri = vscode.Uri.file(pathScript);
						new vscode.Position(0, 0);
						let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
						location =  new vscode.Location(uri, range);
						return location;
					}
				});
			}
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
				}
				let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
				let symbols = ctrlSymbolsCreator.GetSymbols();
				//класс или функция
				for(let i = 0; i < symbols.length; i++) {
					let symbol = symbols[i];
					if(symbol.name == textUnderCursor) {
						location =  new vscode.Location(document.uri, symbol.range);
						return location;
					}
					if(symbol.range.contains(position)) {
						//метод или переменная в функции
						for(let j = 0; j < symbol.children.length; j++) {
							let childSymbol = symbol.children[j];
							if(childSymbol.name == textUnderCursor) {
								location =  new vscode.Location(document.uri, childSymbol.range);
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
										location =  new vscode.Location(document.uri, varSymbol.range);
										return location;
									}
								}
							}					
						}
					}
				}
				let useLocation = this.GetUsesProvider(document, textUnderCursor, typeVarBeforeDot);
				if(useLocation) {
					return useLocation;
				}
			}
			return location;
    }
}