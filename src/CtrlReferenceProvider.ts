import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlSymbolsCreator } from './ctrlSymbolsCreator';

export class CtrlReferenceProvider implements vscode.ReferenceProvider {
    public provideReferences(
        document: vscode.TextDocument, position: vscode.Position,
        options: { includeDeclaration: boolean }, token: vscode.CancellationToken):
        Thenable<vscode.Location[]> {
			return new Promise((resolve, reject) => {
				let refernceLocations = new Array();
				let symbolsCreator = new CtrlSymbolsCreator(document);
				const wordRangeAtPos = document.getWordRangeAtPosition(position);
				const textUnderCursor = document.getText(wordRangeAtPos);
				const symbols = symbolsCreator.GetSymbols();
				let isSymbol = false;
				symbols.forEach(symbol => {
					if(symbol.name == textUnderCursor) {
						isSymbol = true;
					}
					symbol.children.forEach(childSymbol => {
						if(childSymbol.name == textUnderCursor) {
							isSymbol = true
						}
					})
					
				});
				if(!isSymbol) {
					reject();
				}
				refernceLocations = refernceLocations.concat(this.GetLocationSymbol(document.uri,  textUnderCursor));
				const idxLibsFolder = document.uri.fsPath.indexOf('\\scripts\\libs\\');
				if(idxLibsFolder > 0) {
					let usesString = '#uses "' + document.uri.fsPath.slice(idxLibsFolder+14, document.uri.fsPath.length-4)+ '"';
					usesString = usesString.replace(/\\/g, '/');
					this.Getfiles().then(files => {
						files.forEach(file => {
							const fsPath = file.fsPath;
							let fileData = fs.readFileSync(fsPath, 'utf8');
							if(fileData.indexOf(usesString) > 0) {
								const posText = fileData.indexOf(textUnderCursor);
								let splittedLine = fileData.split('\n');
								for (let i = 0; i < splittedLine.length; i++) {
									const line = splittedLine[i];
									const posVar = line.indexOf(textUnderCursor);
									if(posVar > 0) {
										const locationSymbol = new vscode.Location(file, new vscode.Range(new vscode.Position(i, posVar), new vscode.Position(i, posVar+textUnderCursor.length)));
										refernceLocations.push(locationSymbol);
									}
									
								}
							}
						})
						resolve(refernceLocations);
					})
				}
				else {
					resolve(refernceLocations);
				}
			});
    }

	private GetLocationSymbol(file: vscode.Uri , textUnderCursor: string) {
		let refernceLocations = new Array();
		let fileData = fs.readFileSync(file.fsPath, 'utf8');
		const posText = fileData.indexOf(textUnderCursor);
		let splittedLine = fileData.split('\n');
		for (let i = 0; i < splittedLine.length; i++) {
			const line = splittedLine[i];
			const posVar = line.indexOf(textUnderCursor);
			if(posVar > 0) {
				const locationSymbol = new vscode.Location(file, new vscode.Range(new vscode.Position(i, posVar), new vscode.Position(i, posVar+textUnderCursor.length)));
				refernceLocations.push(locationSymbol);
			}
		}
		return refernceLocations;
	}
	private Getfiles() {
		const files = vscode.workspace.findFiles('**/scripts/**/*.ctl');
		return files;
	}
}