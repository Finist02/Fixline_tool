import * as vscode from 'vscode';
import { CtrlSymbolsCreator } from './ctrlSymbolsCreator';
import { TypeQuery } from './ctrlSymbolsCreator';
import * as fs from 'fs';
import * as cmdCtrl from './ctrlComands';
import { GetProjectsInConfigFile } from './ctrlComands';



export class ProvideCompletionItemsCtrl {
	private  completions = new Array();
	public GetSymbols() {        
		return this.completions;
	}
	private SetSymbolsCompletionFunction(symbol: vscode.DocumentSymbol) {
		for(let j = 0; j < symbol.children.length; j++) {
			let variables = symbol.children[j];
			let detail = this.CheckVarType(variables.detail);
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
			complKind = vscode.CompletionItemKind.Constant;

		}
		if(kind == vscode.SymbolKind.Class) {
			complKind = vscode.CompletionItemKind.Class;
			isFunction =false;
		}
		if(kind == vscode.SymbolKind.Struct) {
			complKind = vscode.CompletionItemKind.Struct;
			isFunction =false;
		}
		if(kind == vscode.SymbolKind.Enum) {
			complKind = vscode.CompletionItemKind.Enum;
			isFunction =false;
		}
		let detail = this.CheckVarType(childSymbol.detail);
		let complet = new vscode.CompletionItem({label: childSymbol.name, detail: ' ' +detail + basName}, complKind);
		//отключен для нормального функциониорования CtrlSignatureHelpProvider
		// if(isFunction) {
		// 	complet.insertText = new vscode.SnippetString(childSymbol.name + '($0);');
		// }
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
	public GetTypeVar(document: vscode.TextDocument, varName: string, position: vscode.Position) {
		let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
		let symbols = ctrlSymbolsCreator.GetSymbols();
		for(let i = 0; i < symbols.length; i++) {
			for(let j = 0; j < symbols[i].children.length; j++) {	
				if(symbols[i].children[j].name == varName) {
					return this.CheckVarType(symbols[i].children[j].detail);
				}
				else if(symbols[i].children[j].range.contains(position)) {
					let symbolChild = symbols[i].children[j];
					for(let k = 0; k < symbolChild.children.length; k++) {
						if(symbolChild.children[k].name == varName) {
							return this.CheckVarType(symbolChild.children[k].detail);
						}
					}
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
	private CheckVarType(varType: string)
	{
		let result = varType;
		let regex = /vector\s*<\s*(.*)\s*>/;
		let regex1 = /shared_ptr\s*<\s*(\w+)\s*>/;
		let match = regex.exec(result);
		if(match && match[1]) {
			return 'vector';
		}
		let match1 = regex1.exec(result);
		if(match1 && match1[1]) {
			return match1[1];
		}
		return result;
	}
}

export class CtrlCompletionItemProvider implements vscode.CompletionItemProvider {
	private provideCompletionItemsCtrl: any;
	private GetUsesCompletionItems(document: vscode.TextDocument, typeQuery: TypeQuery, baseClass: string = '', detail: string = '') {
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
						let ctrlSymbolsCreator = new CtrlSymbolsCreator(fileData, typeQuery);
						let symbols = ctrlSymbolsCreator.GetSymbols();
						for(let i = 0; i < symbols.length; i++) {
							let symbol = symbols[i];
							if(baseClass != '' && symbol.name == baseClass) {
								for(let j = 0; j < symbol.children.length; j++) {
									let childSymbol = symbol.children[j];
									let isItemExists = this.provideCompletionItemsCtrl.CheckExistingItem(childSymbol.name);
									if(!isItemExists) {
										let detailView = detail == '' ? '' : ' : ' + detail;
										this.provideCompletionItemsCtrl.SetClassMembers(childSymbol, detailView);
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
						this.GetUsesCompletionItems(document, TypeQuery.protectedSymbols, resRegex[1], resRegex[1]);
					}
				}
			}
		}
		else if(linePrefix.endsWith('.')) {
			let pos1 = new vscode.Position(position.line, position.character - 1);
			let range = document.getWordRangeAtPosition(pos1);
			if(range != undefined) {
				let varBefore = document.getText(range);
				if(varBefore != '') {
					let typeVar = this.provideCompletionItemsCtrl.GetTypeVar(document, varBefore, position);
					if(typeVar.startsWith('dyn_') || typeVar.startsWith('vector')) {
						return GetCompletionItemForArrays();
					}
					
					//поиск в самом файле в другом классе или структуре если вызван член класса
					if(typeVar != '') {
						let ctrlSymbolsCreator = new CtrlSymbolsCreator(document, TypeQuery.publicSymbols);
						let symbols = ctrlSymbolsCreator.GetSymbols();
						for(let i = 0; i < symbols.length; i++) {
							let symbol = symbols[i];
							if(symbol.name == typeVar) {
								for(let j = 0; j < symbol.children.length; j++) {
									let childSymbol = symbol.children[j];
									this.provideCompletionItemsCtrl.SetClassMembers(childSymbol);
								}
							}
						}
					}
					if(typeVar != '') {

						this.GetUsesCompletionItems(document, TypeQuery.publicSymbols, typeVar, '');
					}
				}
			}
		}
		else {
			this.provideCompletionItemsCtrl.SetCompletionClass(document, position);
			this.GetUsesCompletionItems(document, TypeQuery.publicSymbols);
		}
		return this.provideCompletionItemsCtrl.GetSymbols();
	}
}


export class CtrlCompletionItemProviderStatic implements vscode.CompletionItemProvider {
	private provideCompletionItemsCtrl: any;
	private GetUsesCompletionItems(document: vscode.TextDocument, typeQuery: TypeQuery, baseClass: string = '', detail: string = '') {
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
						let ctrlSymbolsCreator = new CtrlSymbolsCreator(fileData, typeQuery);
						let symbols = ctrlSymbolsCreator.GetSymbols();
						for(let i = 0; i < symbols.length; i++) {
							let symbol = symbols[i];
							if(baseClass != '' && symbol.name == baseClass) {
								for(let j = 0; j < symbol.children.length; j++) {
									let childSymbol = symbol.children[j];
									let isItemExists = this.provideCompletionItemsCtrl.CheckExistingItem(childSymbol.name);
									if(!isItemExists) {
										let detailView = detail == '' ? '' : ' : ' + detail;
										this.provideCompletionItemsCtrl.SetClassMembers(childSymbol, detailView);
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
		if(linePrefix.endsWith('::')) {
			let pos1 = new vscode.Position(position.line, position.character - 2);
			let range = document.getWordRangeAtPosition(pos1);
			if(range != undefined) {
				let typeVar = document.getText(range);
				if(typeVar != '') {
					this.GetUsesCompletionItems(document, TypeQuery.staticSymbols, typeVar, 'static');
				}
			}
		}
		return this.provideCompletionItemsCtrl.GetSymbols();
	}
}

export const providerUses = vscode.languages.registerCompletionItemProvider(
	'ctrlpp',
	{
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
			const linePrefix = document.lineAt(position).text.substr(0, position.character);
			const symbol = new vscode.CompletionItem('uses ', vscode.CompletionItemKind.Keyword);
			return [symbol];
		}
	},
	'#' // triggered whenever a '.' is being typed
);

export const providerFiles = vscode.languages.registerCompletionItemProvider(
	'ctrlpp',
	{
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
			const linePrefix = document.lineAt(position).text.substr(0, position.character);
			let complets = new Array;
			if(linePrefix.startsWith('#uses')) {
				let folders = GetProjectsInConfigFile(false);
				//!!заглушка для того чтобы смог отработать
				// let length = folders.length;
				let length = folders.length > 6 ? 6 : folders.length;
				for(let i = 0; i < length; i++) {
					let folderLib = folders[i] + '/scripts/libs';
					let files: string[] = cmdCtrl.ThroughFiles(folderLib);
					for (const file of files) {
						let symbolName = file.slice(folderLib.length+1, -4);
						symbolName = symbolName.replace(/\\/g, '/');
						complets.push(new vscode.CompletionItem(symbolName, vscode.CompletionItemKind.File));
					}
				}
			}
			return complets;
		}
		
	},
	'"'
);

function GetCompletionItemForArrays()
{
	let methodsForArrays =  new Array();
	for (let i = 0; i < arrayDynamicsAutocomp.length; i++) {
		const element = arrayDynamicsAutocomp[i];
		let  complItem = new vscode.CompletionItem(element.label, vscode.CompletionItemKind.Method);
		complItem.insertText = new vscode.SnippetString(element.insertText);
		complItem.documentation = new vscode.MarkdownString(element.documentation);
		methodsForArrays.push(complItem);
	}
	return methodsForArrays;
}


const arrayDynamicsAutocomp = [
	{
		label: 'at',
		documentation:'Returns a reference to the element at the given index.  \n```\nT vector.at(uint idx);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| idx      | Index position |\n',
		insertText: 'at($0)'
	},
	{
		label: 'append',
		documentation: 'Append the given value to the end of the vector/dyn_*.  \n```\nint vector.append(T value);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| value    | Value to be appended |\n',
		insertText: 'append($0)'
	},
	{
		label: 'clear',
		documentation: 'Empties the vector/dyn_*.  \n```\nint vector.clear();\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| -        | -              |\n',
		insertText: 'clear($0)'
	},
	{
		label: 'contains',
		documentation: 'Returns true if an element is equal to the given value or false if not found.  \n```\nbool vector.contains(T key);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| -        | -              |\n',
		insertText: 'contains($0)'
	},
	{
		label: 'count',
		documentation: 'Returns the number of elements in the vector / dyn_*.  \n```\nint vector.count([T key]);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| key      | Vector key     |\n',
		insertText: 'count($0)'
	},
	{
		label: 'first',
		documentation: 'Returns a reference to the first element of the vector/dyn_*.  \n```\nT& vector.first()\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| -        | -     |\n',
		insertText: 'first()'
	},
	{
		label: 'indexListOf',
		documentation: 'Returns a list of indexes at which the given value was found.  \n```\nvector int vector.indexListOf(T value);\nvector int vector.indexListOf(string memberName, T value);\nvector int vector.indexListOf(function_ptr memberFunc, T value);\n```\n'
		+'| Parameter  | Description    |\n'
		+'| ---------- | -------------- |\n'
		+'| value      | Value that is searched for  |\n'
		+'| memberName | Class member used for comparison  |\n'
		+'| memberFunc | Class member function used for comparison |\n',
		insertText: 'indexListOf($0)'
	},
	{
		label: 'indexOf',
		documentation: 'Returns the index of the first element which is equal to the given value. The search starts at the given index.  \n```\nint vector.indexOf(T value, uint startIdx = 0);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| startIdx | Start index position     |\n'
		+'| value | Value that is searched for  |\n',
		insertText: 'indexOf($0)'
	}
	,
	{
		label: 'insertAt',
		documentation: 'Inserts the given value into the vector/dyn_* at the given position.  \n```\nint vector.insertAt(uint idx, T value);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| idx | Index position     |\n'
		+'| value | Value to be added  |\n',
		insertText: 'insertAt($0)'
	},
	{
		label: 'isEmpty',
		documentation: 'Returns true if the vector / dyn_* is empty.  \n```\nbool vector.isEmpty();\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| -        | -     |\n',
		insertText: 'isEmpty()'
	},
	{
		label: 'last',
		documentation: 'Returns a reference to the last element of the vector/dyn_*.  \n```\nT& vector.last();\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| -        | -     |\n',
		insertText: 'last()'
	},
	{
		label: 'prepend',
		documentation: 'Insets the given value as the first element of the vector/dyn_*.  \n```\nint vector.prepend(T value);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| value      | Value to be added |\n',
		insertText: 'prepend($0)'
	},
	{
		label: 'removeAt',
		documentation: 'Removes the element at given index. The vector /dyn_* has one element less after this.  \n```\nint mapping.removeAt(uint idx);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| idx      | Index position that should be removed. |\n',
		insertText: 'removeAt($0)'
	},
	{
		label: 'replaceAt',
		documentation: 'Replaces the value at the given idx position with the given value.  \n```\nint vector.insertAt(int idx, T value);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| idx      | Index position that should be removed. |\n',
		insertText: 'replaceAt($0)'
	},
	{
		label: 'sort',
		documentation: 'Sorts the array.  \n```\nint vector.sort(bool ascending = true);\nint vector.sort(string memberName, bool ascending = true);\nint vector.sort(function_ptr memberFunc, bool ascending = true);\n```\n'
		+'| Parameter  | Description    |\n'
		+'| ---------- | -------------- |\n'
		+'| ascending      | Sorting order  |\n'
		+'| memberName | Class member used for sorting  |\n'
		+'| memberFunc | Class member function used for sorting |\n',
		insertText: 'sort($0)'
	},
	{
		label: 'takeAt',
		documentation: 'Takes the element at the given idx out of the vector/dyn_* and returns its value. The vector/dyn_* has one element less after this.  \n```\nT vector.takeAt(uint idx);\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| idx      | Index positio  |\n',
		insertText: 'takeAt($0)'
	},
	{
		label: 'takeFirst',
		documentation: 'Takes the first element out of the vector/dyn_* and returns its value. The vector/dyn_* has one element less after this.  \n```\nT vector.takeFirst();\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| -        | -     |\n',
		insertText: 'takeFirst()'
	},
	{
		label: 'takeLast',
		documentation: 'Takes the last element out of the vector/dyn_* and returns its value. The vector/dyn_* has one element less after this.  \n```\nT vector.takeLast();\n```\n'
		+'| Parameter| Description    |\n'
		+'| -------- | -------------- |\n'
		+'| -        | -     |\n',
		insertText: 'takeLast()'
	},
	{
		label: 'unique',
		documentation: 'Removes all duplicate elements in an array.  \n```\nint vector.unique();\nint vector.unique(string memberName);\nint vector.unique(function_ptr memberFunc);\n```\n'
		+'| Parameter  | Description    |\n'
		+'| ---------- | -------------- |\n'
		+'| memberName | Class member used for comparing  |\n'
		+'| memberFunc | Class member function used for comparing |\n',
		insertText: 'unique($0)'
	}
	
];