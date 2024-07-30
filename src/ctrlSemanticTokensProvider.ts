import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlSymbolsCreator, TextSplitter, TypeQuery } from './ctrlSymbolsCreator';
import { GetProjectsInConfigFile } from './ctrlComands';
import { CtrlTokenizer } from './CtrlTokenizer';
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
];
export const tokenModifiers = ['declaration', 'definition', 'readonly', 'static', 'deprecated', 'async', 'modification', 'documentation', 'defaultLibrary'];
export const legend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers);

const doxySymbols = [
	'@addindex',
	'@addtogroup',
	'@anchor',
	'@arg',
	'@attention',
	'@author',
	'@authors',
	'@brief',
	'@bug',
	'@category',
	'@class',
	'@code',
	'@copybrief',
	'@copydetails',
	'@copydoc',
	'@copyright',
	'@date',
	'@def',
	'@defgroup',
	'@deprecated',
	'@details',
	'@dir',
	'@docbookinclude',
	'@docbookonly',
	'@dontinclude',
	'@else',
	'@elseif',
	'@endcode',
	'@endcond',
	'@enddocbookonly',
	'@enddot',
	'@endhtmlonly',
	'@endif',
	'@endinternal',
	'@endlatexonly',
	'@endlink',
	'@endmanonly',
	'@endmsc',
	'@endparblock',
	'@endrtfonly',
	'@endsecreflist',
	'@endverbatim',
	'@enduml',
	'@endxmlonly',
	'@enum',
	'@example',
	'@exception',
	'@extends',
	'@f(',
	'@f)',
	'@f$',
	'@f[',
	'@f]',
	'@f{',
	'@f}',
	'@file',
	'@fileinfo',
	'@fn',
	'@groupgraph',
	'@headerfile',
	'@hidecallergraph',
	'@hidecallgraph',
	'@hidecollaborationgraph',
	'@hidedirectorygraph',
	'@hidegroupgraph',
	'@hideincludedbygraph',
	'@hideincludegraph',
	'@hideinheritancegraph',
	'@hideinlinesource',
	'@hiderefby',
	'@hiderefs',
	'@hideinitializer',
	'@htmlinclude',
	'@htmlonly',
	'@idlexcept',
	'@if',
	'@ifnot',
	'@image',
	'@implements',
	'@important',
	'@include',
	'@includedoc',
	'@includedbygraph',
	'@includegraph',
	'@includelineno',
	'@ingroup',
	'@inheritancegraph',
	'@internal',
	'@invariant',
	'@interface',
	'@latexinclude',
	'@latexonly',
	'@li',
	'@line',
	'@lineinfo',
	'@link',
	'@mainpage',
	'@maninclude',
	'@manonly',
	'@memberof',
	'@module',
	'@msc',
	'@mscfile',
	'@n',
	'@name',
	'@namespace',
	'@noop',
	'@nosubgrouping',
	'@note',
	'@overload',
	'@p',
	'@package',
	'@page',
	'@par',
	'@paragraph',
	'@param',
	'@parblock',
	'@post',
	'@pre',
	'@private',
	'@privatesection',
	'@property',
	'@protected',
	'@protectedsection',
	'@protocol',
	'@public',
	'@publicsection',
	'@pure',
	'@qualifier',
	'@raisewarning',
	'@ref',
	'@refitem',
	'@related',
	'@relates',
	'@relatedalso',
	'@relatesalso',
	'@remark',
	'@remarks',
	'@result',
	'@return',
	'@returns',
	'@retval',
	'@rtfinclude',
	'@rtfonly',
	'@sa',
	'@secreflist',
	'@section',
	'@see',
	'@short',
	'@showdate',
	'@showinitializer',
	'@showinlinesource',
	'@showrefby',
	'@showrefs',
	'@since',
	'@skip',
	'@skipline',
	'@snippet',
	'@snippetdoc',
	'@snippetlineno',
	'@static',
	'@startuml',
	'@struct',
	'@subpage',
	'@subparagraph',
	'@subsection',
	'@subsubparagraph',
	'@subsubsection',
	'@tableofcontents',
	'@test',
	'@throw',
	'@throws',
	'@todo',
	'@tparam',
	'@typedef',
	'@union',
	'@until',
	'@var',
	'@verbatim',
	'@verbinclude',
	'@version',
	'@vhdlflow',
	'@warning',
	'@weakgroup',
	'@xmlinclude',
	'@xmlonly',
	'@xrefitem'
];
export class CtrlSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {
	private GetUsesTokens(document: vscode.TextDocument): Array<vscode.DocumentSymbol[]> | undefined {
		let tokensSymbol = new Array;
		for (let i = 0; i < document.lineCount; i++) {
			let lineText = document.lineAt(i).text;
			if (lineText.startsWith('//')) continue;
			let regexp = /#uses\s+"(?<library>.*?)(?:\.ctl)?"/;
			let result = regexp.exec(document.lineAt(i).text);
			if (result?.groups) {
				let library = result.groups['library'];
				let paths = GetProjectsInConfigFile();
				paths.forEach(path => {
					if (fs.existsSync(path + '/scripts/libs/' + library + '.ctl')) {
						let pathScript = path + '/scripts/libs/' + library + '.ctl';
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
		this.highlightComments(document, tokensBuilder);
		let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
		let symbols = ctrlSymbolsCreator.GetSymbols();
		const usesSymbols = this.GetUsesTokens(document);
		//проверка в юсес
		if (usesSymbols) {
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
	private GetBuilder(symbol: vscode.DocumentSymbol, textSplitter: TextSplitter, tokensBuilder: vscode.SemanticTokensBuilder) {
		if (symbol.kind == vscode.SymbolKind.Class
			|| symbol.kind == vscode.SymbolKind.Struct
			|| symbol.kind == vscode.SymbolKind.Enum
			|| symbol.kind == vscode.SymbolKind.Constant) {
			for (let i = 0; i < textSplitter.lineCount; i++) {
				const lineText = textSplitter.getTextLineAt(i);
				if (lineText.startsWith('#')) continue;
				const regExp = new RegExp('\\b' + symbol.name + '\\b', 'g');
				let result = regExp.exec(lineText);
				while (result) {
					let indexClassName = lineText.indexOf(symbol.name, result.index);
					if (indexClassName >= 0) {
						if (symbol.kind == vscode.SymbolKind.Constant) {
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
					}
					result = regExp.exec(lineText);
				}
			}
		}
		symbol.children.forEach(symbolChild => {
			if (symbolChild.kind == vscode.SymbolKind.Constant || symbolChild.kind == vscode.SymbolKind.EnumMember) {
				for (let i = 0; i < textSplitter.lineCount; i++) {
					const lineText = textSplitter.getTextLineAt(i);
					if (lineText.startsWith('#')) continue;
					let regExp = new RegExp('\\.' + symbolChild.name + '\\b', 'g');
					let regExpDefeinition = new RegExp(symbolChild.detail + '\\s+(' + symbolChild.name + ')\\b', 'g');
					let inParentPosition = true;
					//для энумов только после :: или в самом объявлении
					if (symbolChild.kind == vscode.SymbolKind.EnumMember) {
						regExp = new RegExp('\\::' + symbolChild.name + '\\b', 'g');
						regExpDefeinition = new RegExp('\\s*(' + symbolChild.name + ')\\b', 'g');
						if (!symbol.range.contains(new vscode.Position(i, 0))) {
							inParentPosition = false;
						}
					}
					const result = regExp.exec(lineText);
					const result1 = regExpDefeinition.exec(lineText);
					if (result) {
						let indexClassName = lineText.indexOf(symbolChild.name, result.index);
						if (indexClassName >= 0) {
							tokensBuilder.push(
								new vscode.Range(new vscode.Position(i, indexClassName), new vscode.Position(i, indexClassName + symbolChild.name.length)),
								'enumMember',
								['declaration']
							)
						}
					}
					else if (result1 && inParentPosition) {
						let indexClassName = lineText.indexOf(symbolChild.name, result1.index);
						if (indexClassName >= 0) {
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

	private highlightComments(document: vscode.TextDocument, tokensBuilder: vscode.SemanticTokensBuilder) {
		const highlightCommentDoxygen = vscode.workspace.getConfiguration("FixLineTool.Syntax").get("HighlightCommentDoxygen");
		if (!highlightCommentDoxygen || highlightCommentDoxygen == false) return;
		const tokenizer = new CtrlTokenizer(document);
		let token = tokenizer.getNextToken();
		while (token) {
			if (token.symbol.startsWith('//') || token.symbol.startsWith('/*')) {
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
			token = tokenizer.getNextToken();
		}

	}
}