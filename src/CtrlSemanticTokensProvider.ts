import * as vscode from 'vscode';
import { CtrlTokenizer, Token } from './CtrlTokenizer';
import { CtrlAllSymbols, CtrlConstantsSymbols, CtrlDocumentSymbol, SymbolModifiers } from './CtrlSymbols';
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
	private tokensBuilder: vscode.SemanticTokensBuilder;// = new vscode.SemanticTokensBuilder(legend);
	private newObjects: string[] = [];
	private enums: string[] = [];
	public provideDocumentSemanticTokens(
		document: vscode.TextDocument
	): vscode.ProviderResult<vscode.SemanticTokens> {
		this.tokensBuilder = new vscode.SemanticTokensBuilder(legend);
		this.highlightTokens(document);
		return this.tokensBuilder.build();
	}

	private highlightTokens(document: vscode.TextDocument) {
		const tokenizer = new CtrlTokenizer(document);
		const innersReadFiles = vscode.workspace.getConfiguration("FixLineTool.Syntax").get("InnersReadFiles");
		let deepFileRead = 1;
		if (typeof innersReadFiles === 'number') deepFileRead = innersReadFiles;
		const symbolCreator = new CtrlConstantsSymbols(document, deepFileRead, tokenizer);
		let constantsAndNewVars = symbolCreator.getConstantsAndNewVars();
		let constantsInOtherFiles: string[] = [];
		this.newObjects = [];
		this.enums = [];

		for (let i = 0; i < constantsAndNewVars.length; i++) {
			if (constantsAndNewVars[i].modifiers.indexOf(SymbolModifiers.Const) >= 0) {
				constantsInOtherFiles.push(constantsAndNewVars[i].name);
			}
			else if (constantsAndNewVars[i].kind == vscode.SymbolKind.Enum) {
				this.enums.push(constantsAndNewVars[i].name);
			}
			else {
				this.newObjects.push(constantsAndNewVars[i].name);
			}
		}
		const highlightCommentDoxygen = vscode.workspace.getConfiguration("FixLineTool.Syntax").get("HighlightCommentDoxygen");
		if (highlightCommentDoxygen) {
			tokenizer.commentTokens.forEach(comment => {
				this.highlightComments(comment);
			});
		}
		const allSymbolsCreator = new CtrlAllSymbols(document, deepFileRead, tokenizer);
		const allSymbols = allSymbolsCreator.getAllMembers();
		for (let i = 0; i < allSymbols.length; i++) {
			if (allSymbols[i].modifiers.indexOf(SymbolModifiers.Const) >= 0) {
				constantsInOtherFiles.push(allSymbols[i].name);
				this.tokensBuilder.push(allSymbols[i].range, 'enumMember', ['declaration']);
			}
			if (allSymbols[i].kind == vscode.SymbolKind.Enum) {
				this.enums.push(allSymbols[i].name);
				this.highlightEnum(allSymbols[i], this.tokensBuilder);
			}
			else if (allSymbols[i].kind == vscode.SymbolKind.Class || allSymbols[i].kind == vscode.SymbolKind.Struct) {
				let constMembers: string[] = [];
				//проверка унаследованности
				let classTokens = tokenizer.getTokens(allSymbols[i].selectionRange);
				if (classTokens[2].symbol == ':') {
					this.tokensBuilder.push(classTokens[3].range, 'class', ['declaration']);
				}
				for (let j = 0; j < allSymbols[i].children.length; j++) { // members
					const children = allSymbols[i].children[j];
					if (children.modifiers.indexOf(SymbolModifiers.Const) >= 0) {
						constMembers.push(children.name);
						this.tokensBuilder.push(children.range, 'enumMember', ['declaration']);
					}
					else if (children.kind == vscode.SymbolKind.Method || children.kind == vscode.SymbolKind.Constructor) {
						let methodTokens = tokenizer.getTokens(children.selectionRange);
						this.highlightBodyFunctionConst(children.children, methodTokens, constantsInOtherFiles, [], constMembers);
						if (children.name.startsWith('~') && ('~' + allSymbols[i].name == children.name)) {
							this.tokensBuilder.push(children.range, 'class', ['declaration']);
						}
					}
					if ((this.newObjects.indexOf(children.detail) >= 0 || this.enums.indexOf(children.detail) >= 0) && children.rangeType) {
						this.tokensBuilder.push(children.rangeType, 'class', ['declaration']);
					}
				}
			}
			else if (allSymbols[i].kind == vscode.SymbolKind.Function) {
				let functionTokens = tokenizer.getTokens(allSymbols[i].selectionRange);
				this.highlightBodyFunctionConst(allSymbols[i].children, functionTokens, constantsInOtherFiles);

			}
			else {
				let varTokens = tokenizer.getTokens(allSymbols[i].selectionRange);
				this.highlightBodyFunctionConst([allSymbols[i]], varTokens, constantsInOtherFiles);
			}
		}
	}

	private highlightEnum(symbol: vscode.DocumentSymbol, tokensBuilder: vscode.SemanticTokensBuilder) {
		tokensBuilder.push(symbol.range, 'class', ['declaration']);
		for (let j = 0; j < symbol.children.length; j++) { // enumMembers
			const children = symbol.children[j];
			tokensBuilder.push(children.range, 'enumMember', ['declaration']);
		}
	}

	private highlightBodyFunctionConst(symbols: CtrlDocumentSymbol[], tokens: Token[], constantsInOtherFiles: string[], constInScopes: string[] = [], constMembers: string[] = []) {
		let constInScopes1 = structuredClone(constInScopes);
		constInScopes1 = constInScopes1.concat(constMembers);
		constInScopes1 = constInScopes1.concat(constantsInOtherFiles);
		for (let i = symbols.length - 1; i > -1; i++) {
			const symbol = symbols.shift();
			if (symbol == undefined) break;
			this.highlitghtScope(tokens, constInScopes1, constMembers, symbol.range);
			constInScopes1 = constInScopes1.filter((constElement: string) => {
				return constElement != symbol.name
			});
			if (symbol.modifiers.indexOf(SymbolModifiers.Const) >= 0) {
				constInScopes1.push(symbol.name);
			}
			if (symbol.children.length > 0) {
				this.highlightBodyFunctionConst(symbol.children, tokens, constantsInOtherFiles, constInScopes1, constMembers);
			}
		}
		this.highlitghtScope(tokens, constInScopes1, constMembers, null);
	}

	private highlitghtScope(tokens: Token[], constInScopes: string[], constMembers: string[], stopRange: vscode.Range | null) {
		let token = tokens.shift();
		let tokenPrev = token;
		let tokenPrevPrev = token;
		while (token) {
			if (stopRange && token.range.start.line >= stopRange.start.line) break;
			if (token.symbol == '}') return;
			if (constInScopes.indexOf(token.symbol) >= 0) {
				if (tokenPrevPrev && tokenPrevPrev.symbol != 'this') {
					this.tokensBuilder.push(token.range, 'enumMember', ['declaration']);
				}
			}
			if (constMembers.indexOf(token.symbol) >= 0) {
				if (tokenPrevPrev && tokenPrevPrev.symbol == 'this') {
					this.tokensBuilder.push(token.range, 'enumMember', ['declaration']);
				}
			}
			else if (this.newObjects.indexOf(token.symbol) >= 0) {
				this.tokensBuilder.push(token.range, 'class', ['declaration']);
			}
			else if (this.enums.indexOf(token.symbol) >= 0) {
				this.tokensBuilder.push(token.range, 'class', ['declaration']);
				if (tokens.length > 2) {
					let nextToken = tokens.shift();
					if (nextToken && nextToken.symbol == '::') {
						nextToken = tokens.shift();
						if (nextToken) {
							this.tokensBuilder.push(nextToken.range, 'enumMember', ['declaration']);
						}
					}
				}
			}
			tokenPrevPrev = tokenPrev;
			tokenPrev = token;
			token = tokens.shift();
		}
		if (token) tokens.splice(0, 0, token);
	}

	private highlightComments(token: Token) {
		const splittedLines = token.symbol.split('\n');
		for (let i = 0; i < splittedLines.length; i++) {
			const lineText = splittedLines[i];
			const match = /@\b(\S*)/.exec(lineText);
			if (match && match[1]) {
				if (tokenTypes.length > i)
					this.tokensBuilder.push(
						new vscode.Range(new vscode.Position(token.range.start.line + i, match.index), new vscode.Position(token.range.start.line + i, match.index + match[1].length + 1)),
						'regexp',
						// tokenTypes[i],
						['documentation']
					);
				if (match[1] == 'param') {
					const match2 = /(@param\s+)(\S*)/.exec(lineText);
					if (match2 && match2[2]) {
						this.tokensBuilder.push(
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
