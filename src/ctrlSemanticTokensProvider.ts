import * as vscode from 'vscode';
import { CtrlTokenizer, Token } from './CtrlTokenizer';
import { CtrlAllSymbols, CtrlConstantsSymbols } from './CtrlSymbols';
export const tokenTypes = [
	'namespace'
	, 'class'
	, 'enum'
	, 'struct'
	, 'typeParameter'
	, 'type'
	, 'parameter'
	, 'variable'
	, 'property'
	, 'enumMember'
	, 'function'
	, 'method'
	, 'comment'
	, 'string'
	, 'keyword'
	, 'number'
	, 'regexp'
	, 'operator'
	, 'constant'
];
export const tokenModifiers = ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'async', 'modification', 'documentation', 'defaultLibrary'];
export const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

export class CtrlSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

	public provideDocumentSemanticTokens(
		document: vscode.TextDocument
	): vscode.ProviderResult<vscode.SemanticTokens> {
		const tokensBuilder = new vscode.SemanticTokensBuilder(legend);
		this.highlightTokens(document, tokensBuilder);
		return tokensBuilder.build();
	}

	private highlightTokens(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder) {
		const tokenizer = new CtrlTokenizer(document);
		const innersReadFiles = vscode.workspace.getConfiguration("FixLineTool.Syntax").get("InnersReadFiles");
		let deepFileRead = 1;
		if (typeof innersReadFiles === 'number') deepFileRead = innersReadFiles;
		const symbolCreator = new CtrlConstantsSymbols(document, deepFileRead, tokenizer);
		let constantsAndNewVars = symbolCreator.getConstantsAndNewVars();
		let constants: string[] = [];
		let newObjects: string[] = [];
		for (let i = 0; i < constantsAndNewVars.length; i++) {
			if (constantsAndNewVars[i].kind == vscode.SymbolKind.EnumMember || constantsAndNewVars[i].kind == vscode.SymbolKind.Constant) {
				constants.push(constantsAndNewVars[i].name);
			}
			else {
				newObjects.push(constantsAndNewVars[i].name);
			}
		}
		const highlightCommentDoxygen = vscode.workspace.getConfiguration("FixLineTool.Syntax").get("HighlightCommentDoxygen");
		if (highlightCommentDoxygen) {
			tokenizer.commentTokens.forEach(comment => {
				this.highlightComments(comment, tokensBuilder);
			});
		}
		const allSymbolsCreator = new CtrlAllSymbols(document, deepFileRead, tokenizer);
		const allSymbols = allSymbolsCreator.getAllMembers();
		for (let i = 0; i < allSymbols.length; i++) {
			if (allSymbols[i].kind == vscode.SymbolKind.Constant) {
				constants.push(allSymbols[i].name);
				tokensBuilder.push(allSymbols[i].selectionRange, 'enumMember', ['declaration']);
			}
			else if (allSymbols[i].kind == vscode.SymbolKind.Enum) {
				newObjects.push(allSymbols[i].name);
				this.highlightEnum(allSymbols[i], tokensBuilder);
			}
			else if (allSymbols[i].kind == vscode.SymbolKind.Class || allSymbols[i].kind == vscode.SymbolKind.Struct) {
				for (let j = 0; j < allSymbols[i].children.length; j++) { // members
					const children = allSymbols[i].children[j];
					if (children.kind == vscode.SymbolKind.Constant) {
						constants.push(children.name);
						tokensBuilder.push(children.selectionRange, 'enumMember', ['declaration']);
					}
					else if (children.kind == vscode.SymbolKind.Method || children.kind == vscode.SymbolKind.Constructor) {
						let methodTokens = tokenizer.getTokens(children.selectionRange);
						methodTokens.forEach(tokenInMetod => {
							if (constants.indexOf(tokenInMetod.symbol) >= 0) {
								tokensBuilder.push(tokenInMetod.range, 'enumMember', ['declaration']);
							}
							else if (newObjects.indexOf(tokenInMetod.symbol) >= 0) {
								tokensBuilder.push(tokenInMetod.range, 'class', ['declaration']);
							}
						});
					}
				}
			}
			else if (allSymbols[i].kind == vscode.SymbolKind.Function) {
				let functionTokens = tokenizer.getTokens(allSymbols[i].selectionRange);
				functionTokens.forEach(functionToken => {
					if (constants.indexOf(functionToken.symbol) >= 0) {
						tokensBuilder.push(functionToken.range, 'enumMember', ['declaration']);
					}
					else if (newObjects.indexOf(functionToken.symbol) >= 0) {
						tokensBuilder.push(functionToken.range, 'class', ['declaration']);
					}
				});
			}

		}
	}

	private highlightEnum(symbol: vscode.DocumentSymbol, tokensBuilder: vscode.SemanticTokensBuilder) {
		tokensBuilder.push(symbol.selectionRange, 'class', ['declaration']);
		for (let j = 0; j < symbol.children.length; j++) { // enumMembers
			const children = symbol.children[j];
			tokensBuilder.push(children.selectionRange, 'enumMember', ['declaration']);
		}
	}








	private highlightBodyFunction(symbols: vscode.DocumentSymbol[], tokensBuilder: vscode.SemanticTokensBuilder, varNames: string[], type: string, modification: string[]) {
		symbols.forEach(symbol => {
			if (varNames.includes(symbol.name)) {
				tokensBuilder.push(symbol.range, type, modification);
			}
			this.highlightBodyFunction(symbol.children, tokensBuilder, varNames, type, modification);
		});
	}

	private highlightComments(token: Token, tokensBuilder: vscode.SemanticTokensBuilder) {
		const splittedLines = token.symbol.split('\n');
		for (let i = 0; i < splittedLines.length; i++) {
			const lineText = splittedLines[i];
			const match = /@\b(\S*)/.exec(lineText);
			if (match && match[1]) {
				if (tokenTypes.length > i)
					tokensBuilder.push(
						new vscode.Range(new vscode.Position(token.range.start.line + i, match.index), new vscode.Position(token.range.start.line + i, match.index + match[1].length + 1)),
						'regexp',
						// tokenTypes[i],
						['documentation']
					);
				if (match[1] == 'param') {
					const match2 = /(@param\s+)(\S*)/.exec(lineText);
					if (match2 && match2[2]) {
						tokensBuilder.push(
							new vscode.Range(new vscode.Position(token.range.start.line + i, match2.index + match2[1].length), new vscode.Position(token.range.start.line + i, match2.index + match2[1].length + match2[2].length + 1)),
							'variable',
							['documentation']
						);
					}
				}
			}
		}
	}
}
