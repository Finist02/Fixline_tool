import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlSymbolsCreator, TextSplitter, TypeQuery } from './ctrlSymbolsCreator';

export class CtrlHoverProvider  implements vscode.HoverProvider {
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
	private GetUsesProvider(document: vscode.TextDocument, textUnderCursor: string, parentType: string): string[] | undefined {
		let comment = undefined;
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
						for(let i = 0; i < symbols.length; i++) {
							let symbol = symbols[i];
							if(parentType != '' && symbol.name == parentType) {
								for(let j = 0; j < symbol.children.length; j++) {
									if(symbol.children[j].name == textUnderCursor) {
										comment = this.GetTextComment(fileData, symbol.children[j]);
										break;
									}
								}
							}
							else if(symbol.name == textUnderCursor) {
								comment = this.GetTextComment(fileData, symbol);
								break;
							}
						}
					}
				})
        	}
		}
		
		// if(location) comment = this.GetTextInLocation(document, location);
		return comment;
	}
    public provideHover(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        undefined | vscode.Hover | Thenable<vscode.Hover> {
			const comment = this.GetTextBeforeVariable(document, position, token);
			if(comment && comment[1])
			{
				comment[1] = '```\n' + comment[1] +'\n```\n-------\n\n';
				return new vscode.Hover(new vscode.MarkdownString(comment[1] + comment[0]));				
			}
            return undefined;
    }
	public async GetSignatureHover(
		document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken
	) {
		const comment = this.GetTextBeforeVariable(document, position, token);
		if(comment && comment[1])
		{
				return comment;				
		}
        return undefined;
	}
    private GetTextBeforeVariable(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        undefined | string[] {
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
					return this.GetTextComment(document, symbol);
				}
				if(symbol.range.contains(position)) {
					//метод или переменная в функции
					for(let j = 0; j < symbol.children.length; j++) {
						let childSymbol = symbol.children[j];
						if(childSymbol.name == textUnderCursor) {
							return this.GetTextComment(document, childSymbol);
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
								//если это поле класса
								if(varBefore != '' && varSymbol.name == varBefore) {
									typeVarBeforeDot = varSymbol.detail;
									let regex = /shared_ptr\s*<\s*(\w+)\s*>/;
									let match = regex.exec(typeVarBeforeDot);
									if(match && match[1] != 'this') {
										typeVarBeforeDot = match[1];
									}
								}
								//сама переменная не комментируется
								// if(varSymbol.name == textUnderCursor) {
								// 	return this.GetTextComment(document, varSymbol.range);
								// }
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
										return this.GetTextComment(document, symbol.children[j]);
									}
								}
							}
						}
					}
					//поиск в классе родителе
					let regex = /:\s*([a-zA-Z_]\w+)/;
					let resRegex = regex.exec(symbol.detail);
					if(resRegex) {
						return this.GetUsesProvider(document, textUnderCursor, resRegex[1]);
					}
				}
			}
			return this.GetUsesProvider(document, textUnderCursor, typeVarBeforeDot);
    }
	private GetTextComment(textInScript: vscode.TextDocument | string, symbol: vscode.DocumentSymbol) {
		let comment: string[] = new Array;
		let rangeVar = symbol.range;
		let document: TextSplitter;
		let lineCloseComment = rangeVar.start.line-1;
		let lineNumOpenComment = lineCloseComment;
		if(typeof textInScript === 'string') {
			document = new TextSplitter(textInScript);
        }
        else {
			document = new TextSplitter(textInScript.getText());
        }
		if(symbol.kind == vscode.SymbolKind.Field) {
			comment[0] = '';
			comment[1] = document.getText(rangeVar);
			comment[1] = comment[1].replace(/\t/g, '');
			return comment;
		}
		let lineText = document.getTextLineAt(rangeVar.start.line-1);
		if(lineText.match(/^\s*\*\//)) {
			for(let i = 1; i < 20; i++) {
				lineText = document.getTextLineAt(rangeVar.start.line-i);
				if(lineText.match(/^\s*\/\*/)) {
					lineNumOpenComment = lineNumOpenComment - i+2;
					const rangeComment = new vscode.Range(new vscode.Position(lineNumOpenComment, rangeVar.start.character), new vscode.Position(rangeVar.start.line-2, rangeVar.start.character));
					comment[0] = document.getText(rangeComment);
					break;
				}
			}
		}
		let linesInnerParams = this.GetLinesNumContext(document, rangeVar.start.line, /\(/, /\)/);
		if(linesInnerParams[0] >= 0) {
			const funcRange = new vscode.Range(new vscode.Position(linesInnerParams[0], 0), new vscode.Position(linesInnerParams[1], document.getTextLineAt(linesInnerParams[1]).length-1));
			let funcName = document.getText(funcRange);
			if(funcName) {
				comment[1] = funcName.trim().replace(/\n\s*/gs, '');
			}
			if(comment[0]) {
				comment[0] = comment[0].replace(' * @brief ', '');
				comment[0] = comment[0].replace(/\t+/g, '\t');
			}
		}
		else {
			comment[1] = '';
		}
		return comment;
	}
	private GetLinesNumContext(textSplitter: TextSplitter, lineStart: number, symbolOpen: string|RegExp, symbolClose: string|RegExp) {
        let isInsideContext = false;
        let countBrace = 0;
        let startLineBody = 0;
		if(!textSplitter.getTextLineAt(lineStart).match(symbolOpen)) {
			return [-1, -1];
		}
        for (let i = lineStart; i < textSplitter.lineCount; i++) {
            let lineText = textSplitter.getTextLineAt(i);
            if(lineText.match(symbolOpen)) {
                if(!isInsideContext) {
                    isInsideContext = true;
                    startLineBody = i;
                }
                countBrace++;
            }
            if(lineText.match(symbolClose)) countBrace--;
            if(countBrace == 0 && isInsideContext) {
                isInsideContext = false;
                return [startLineBody, i];
            }
        }
        return [-1, -1];
    }
}