import * as vscode from 'vscode';

export class CtrlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	public provideDocumentSymbols(document: vscode.TextDocument,
		token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
	return new Promise((resolve, reject) => {
		let symbols = new CtrlSymbolsCreator(document);
		resolve(symbols.GetSymbols());
	});}
}

export enum TypeQuery {
    publicSymbols,
    protectedSymbols,
    staticSymbols,
    allSymbols
}
export class TextSplitter {
    private lines: string[];
    public lineCount:number;
    private text: string;
    constructor(text: string) {
        this.text = text;
        this.lines = this.text.split('\n');
        this.lineCount = this.lines.length;
    }
    public deleteComment() {
        let commentRegExp = /\/\*.*?\*\//gs.exec(this.text);
        while(commentRegExp) {
            const countNewLines = commentRegExp[0].split('\n');
            if(countNewLines.length > 1) {
                this.text = this.text.replace(commentRegExp[0], '\n'.repeat(countNewLines.length-1));
            }
            else {
                this.text = this.text.replace(commentRegExp[0], ' '.repeat(commentRegExp[0].length-1));
            }
            commentRegExp = /\/\*.*?\*\//gs.exec(this.text);
        }
        let lineCommentRegExp = /\/\/.*?\n/gs.exec(this.text);
        while(lineCommentRegExp) {
                this.text = this.text.replace(lineCommentRegExp[0], '\n');
                lineCommentRegExp = /\/\/.*?\n/gs.exec(this.text);
        }
        this.lines = this.text.split('\n');
        this.lineCount = this.lines.length;
    }
    public getTextLineAt(num: number) {
        return this.lines[num] + '\n';
    }
    public getText(range: vscode.Range) {
        let text = '';
        for(let i = range.start.line; i <= range.end.line; i++) {
                text += this.lines[i] + '\n';
        }
        return text;
    }
    public getRangeLine(num: number) {
        let text = this.getTextLineAt(num);
        let rangeClass = new vscode.Range(new vscode.Position(num, 0), new vscode.Position(num, text.length));
        return rangeClass;
    }
}
export class CtrlSymbolsCreator {
    private textSplitter: TextSplitter;
    private symbols: vscode.DocumentSymbol[] = [];
    private nodes: Array<vscode.DocumentSymbol[]> = [this.symbols];
    private comment: RegExp = /(\/\*.*\/)/;
    private parsedLines = new Array;
    private typeQuery: TypeQuery;
    constructor(document: vscode.TextDocument | string, typeQuery: TypeQuery = TypeQuery.allSymbols) {
        this.typeQuery = typeQuery;
        if(typeof document === 'string') {
            this.textSplitter = new TextSplitter(document);
        }
        else {
            this.textSplitter = new TextSplitter(document.getText());
        }
        this.textSplitter.deleteComment();
    }
    public GetSymbols() {
        this.GetVarInFile();
        for (let i = 0; i < this.textSplitter.lineCount; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            if(lineText.startsWith('//')) continue;
            i = this.GetClasses(i);
        }
        for (let i = 0; i < this.textSplitter.lineCount; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            if(lineText.startsWith('//')) continue;
            i = this.GetEnums(i);
        }
        for (let i = 0; i < this.textSplitter.lineCount; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            if(lineText.startsWith('//')) continue;
            i = this.GetFunctions(i);
        }
        return this.symbols;
    }
    private GetEnums(lineNum: number) {
        for (let i = lineNum; i < this.textSplitter.lineCount; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            let classRegExp = this.RunRegExp(/enum\s*(\w+)/, lineText);
			if(classRegExp) {
                let linesClass = this.GetLinesNumContext(i, '{', '}');
                if(linesClass[0] < 0) return lineNum;
                let RangeClass = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesClass[1]).end);
                let docSymbol = new vscode.DocumentSymbol(classRegExp[1], 'enum', vscode.SymbolKind.Enum, RangeClass, this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
                if(this.typeQuery == TypeQuery.allSymbols) {
                    this.nodes.push(docSymbol.children);
                    this.FindEnumMembers(linesClass[0], linesClass[1]);
                    this.nodes.pop();
                }
                this.SetParsedLines(i, linesClass[1]);
                return  linesClass[1];                
            }
        }
        return lineNum;
    }
    private FindEnumMembers(start: number, end: number) {
        for (let i = start; i <= end; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            //поле
            let funcRegExp = this.RunRegExp(/^\s*,?(\w+)/g, lineText);
            if(funcRegExp) {
                let docSymbol = new vscode.DocumentSymbol(funcRegExp[1], 'enumMember', vscode.SymbolKind.EnumMember, this.textSplitter.getRangeLine(i), this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
                continue;
    }}}
    private GetClasses(lineNum: number) {
        for (let i = lineNum; i < this.textSplitter.lineCount; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            let classRegExp = this.RunRegExp(/\s*(class|struct)\s+([a-zA-Z0-9_]+)(?:\s*:\s*)?([a-zA-Z0-9_]+)?/, lineText);
			if(classRegExp) {
                let linesClass = this.GetLinesNumContext(i, '{', '}');
                if(linesClass[0] < 0) return lineNum;
                let classType = 'class';
                if(classRegExp[3]) {
                    classType += ' : ' + classRegExp[3];
                }
                let RangeClass = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesClass[1]).end);
                let docSymbol;
                let SelectionRange = new vscode.Range(new vscode.Position(i, lineText.indexOf(classRegExp[2])), new vscode.Position(i, lineText.indexOf(classRegExp[2]) + classRegExp[2].length));
                if(classRegExp[1] == 'class') {
                    docSymbol = new vscode.DocumentSymbol(classRegExp[2], classType, vscode.SymbolKind.Class, RangeClass, SelectionRange);
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                    this.nodes.push(docSymbol.children);
                    this.FindMembersInClass(linesClass[0], linesClass[1]);
                }
                if(classRegExp[1] == 'struct') {
                    docSymbol = new vscode.DocumentSymbol(classRegExp[2], 'struct', vscode.SymbolKind.Struct, RangeClass, SelectionRange);
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                    this.nodes.push(docSymbol.children);
                    this.GetFieldsInStruct(linesClass[0], linesClass[1]);
                }
                this.nodes.pop();
                this.SetParsedLines(i, linesClass[1]);
                return  linesClass[1];                
            }
        }
        return this.textSplitter.lineCount;
    }
    private FindMembersInClass(start: number, end: number) {
        for (let i = start; i <= end; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            //поле
            let funcRegExp = this.RunRegExp(/^\s*(?<scope>private|public|protected)(?<static>\s+static)?\s+(?<const>const)?\s*(?<typeVar>[a-zA-Z0-9_<>]+)\s+(?<nameVar>\w+)\s*(?:=.*|;)/g, lineText);
            if(funcRegExp && funcRegExp.groups) {
                let typeVar = funcRegExp.groups['typeVar'];
                let scope = funcRegExp.groups['scope'];
                let nameVar = funcRegExp.groups['nameVar'];
                let docSymbol;
                let SelectionRange = new vscode.Range(new vscode.Position(i, lineText.indexOf(nameVar)), new vscode.Position(i, lineText.indexOf(nameVar) + nameVar.length));
                if(funcRegExp.groups['const'] == undefined) {
                    docSymbol = new vscode.DocumentSymbol(nameVar, typeVar, vscode.SymbolKind.Field, this.textSplitter.getRangeLine(i), SelectionRange);
                }
                else {
                    docSymbol = new vscode.DocumentSymbol(nameVar, typeVar, vscode.SymbolKind.Constant, this.textSplitter.getRangeLine(i), SelectionRange);
                }
                if(this.typeQuery == TypeQuery.allSymbols) {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                }
                else if(this.typeQuery == TypeQuery.protectedSymbols && (scope == 'protected' || scope == 'public')) {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                }
                else if(this.typeQuery == TypeQuery.publicSymbols && scope == 'public') {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                }
                else if(this.typeQuery == TypeQuery.staticSymbols && scope == 'public' && funcRegExp.groups['static']) {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                }
                continue;
            }
            //метод
            funcRegExp = this.RunRegExp(/\s*(?<scope>private|public|protected)(?<static>\s+static)?\s+(?<typeMethod>[a-zA-Z0-9_<>]+)\s+(?<nameMethod>\w+)\s*\(/g, lineText);
            if(funcRegExp && funcRegExp.groups) {
                let typeMethod = funcRegExp.groups['typeMethod'];
                let nameMethod = funcRegExp.groups['nameMethod'];
                let scope = funcRegExp.groups['scope'];
                let linesFunc = this.GetLinesNumContext(i, '{', '}');
                let linesInnerParams = this.GetLinesNumContext(i, /\(/, /\)/);
                if(linesFunc[0] < 0 || linesInnerParams[0] < 0) continue;
                let RangeFunc = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesFunc[1]).end);
                let SelectionRange = new vscode.Range(new vscode.Position(i, lineText.indexOf(nameMethod)), new vscode.Position(i, lineText.indexOf(nameMethod) + nameMethod.length));
                let docSymbol = new vscode.DocumentSymbol(nameMethod, typeMethod, vscode.SymbolKind.Method, RangeFunc, SelectionRange);                
                if(this.typeQuery == TypeQuery.allSymbols) {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                    this.nodes.push(docSymbol.children);
                    this.GetParamsFunc(linesInnerParams[0], linesInnerParams[1]);
                    this.GetVariablesInFunc(linesFunc[0], linesFunc[1]);
                    this.nodes.pop();
                }
                else if(this.typeQuery == TypeQuery.protectedSymbols && (scope == 'protected' || scope == 'public')) {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                }
                else if(this.typeQuery == TypeQuery.publicSymbols && scope == 'public') {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                }
                else if(this.typeQuery == TypeQuery.staticSymbols && scope == 'public' && funcRegExp.groups['static']) {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                }
                continue;
            }
            //конструктор
            funcRegExp = this.RunRegExp(/\s*public\s+(\w+)\s*\(/g, lineText);
            if(funcRegExp) {
                let detail = 'constructor';
                let name = funcRegExp[1];
                let linesInnerParams = this.GetLinesNumContext(i, /\(/, /\)/);
                let linesFunc = this.GetLinesNumContext(i, '{', '}');
                if(linesFunc[0] < 0 || linesInnerParams[0] < 0) continue;
                let RangeFunc = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesFunc[1]).end);
                let docSymbol = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Constructor, RangeFunc, this.textSplitter.getRangeLine(i));
                if(this.typeQuery == TypeQuery.allSymbols) {
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                    this.nodes.push(docSymbol.children);
                    this.GetParamsFunc(linesInnerParams[0], linesInnerParams[1]);
                    this.GetVariablesInFunc(linesFunc[0], linesFunc[1]);
                    this.nodes.pop();
                }
                continue;
            }
        }
    }
    private SetParsedLines(start: number, end: number) {
        for (let i = start; i <= end; i++) {
            this.parsedLines.push(i);
        }
    }
    private GetVarInFile() {
        for (let i = 0; i < this.textSplitter.lineCount; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            if(lineText.startsWith('//')) continue;
            let funcRegExp = this.RunRegExp(/^(?:global\s*)?(?:const)\s*([a-zA-Z0-9_\<\>]+)\s+([a-zA-z_]\w*)/, lineText);
            if(funcRegExp) {
                let detail = funcRegExp[1];
                let name = funcRegExp[2];
                let docSymbol = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Constant, this.textSplitter.getRangeLine(i), this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);;
            }
        }
    }
    private GetFunctions(lineNum: number) {
        for (let i = lineNum; i < this.textSplitter.lineCount; i++) {
            if(this.parsedLines.indexOf(i) != -1) {continue;}
            let lineText = this.textSplitter.getTextLineAt(i);
            if(lineText.startsWith('//')) continue;
            let funcRegExp = this.RunRegExp(/\s*([a-zA-z0-9_\<\>]+)\s+(\w+)s*\(/, lineText);
            if(funcRegExp) {
                let detail = funcRegExp[1];
                let name = funcRegExp[2];
                let linesFunc = this.GetLinesNumContext(i, '{', '}');
                let linesInnerParams = this.GetLinesNumContext(i, /\(/, /\)/);
                if(linesFunc[0] < 0 || linesInnerParams[0] < 0) return lineNum;
                let RangeFunc = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesFunc[1]).end);
                let docSymbol = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Function, RangeFunc, this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
                if(this.typeQuery == TypeQuery.allSymbols) {
                    this.nodes.push(docSymbol.children);
                    this.GetParamsFunc(linesInnerParams[0], linesInnerParams[1]);
                    this.GetVariablesInFunc(linesFunc[0], linesFunc[1]);
                    this.nodes.pop();
                }
                this.SetParsedLines(i, linesFunc[1]);
                return  linesFunc[1];
            }
            else {
                funcRegExp = this.RunRegExp(/main\s*\(.*\)\s*/, lineText);
                if(funcRegExp) {
                    let linesInnerParams = this.GetLinesNumContext(i, /\(/, /\)/);
                    let linesFunc = this.GetLinesNumContext(i, '{', '}');
                    if(linesFunc[0] < 0 || linesInnerParams[0] < 0) return lineNum;
                    let RangeFunc = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesFunc[1]).end);
                    let docSymbol = new vscode.DocumentSymbol('main', 'void', vscode.SymbolKind.Function, RangeFunc, this.textSplitter.getRangeLine(i));
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                    if(this.typeQuery == TypeQuery.allSymbols) {
                        this.nodes.push(docSymbol.children);
                        this.GetParamsFunc(linesInnerParams[0], linesInnerParams[1]);
                        this.GetVariablesInFunc(linesFunc[0], linesFunc[1]);
                        this.nodes.pop();
                    }
                    this.SetParsedLines(i, linesFunc[1]);
                    return  linesFunc[1];
                }
            }
        }
        return this.textSplitter.lineCount;
    }
    private GetParamsFunc(start: number, end: number) {
        let textParams = '';
        for (let i = start; i <= end; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            textParams += lineText + '\n';
        }
        let regexp = /\s*(?<const>const)?\s*(?<typeVar>[a-zA-Z0-9_\<\>]+)\s+(?<nameVar>&?[a-zA-z]\w*),?/gs;
        let result = regexp.exec(textParams); //пропускаем имя функции
        if(result && result.groups && result[3] == 'static') {
            let result = regexp.exec(textParams); //пропускаем статики
        }
        while (result && result.groups) {
            result = regexp.exec(textParams);
            if(!result || !result.groups) break;
            let typeVar = result.groups['typeVar'];
            let nameVar = result.groups['nameVar'].replace('&', '');
            let docSymbol;
            if(result.groups['const'] == undefined) {
                docSymbol = new vscode.DocumentSymbol(nameVar, typeVar, vscode.SymbolKind.Variable, this.textSplitter.getRangeLine(start), this.textSplitter.getRangeLine(start));
            }
            else {
                docSymbol = new vscode.DocumentSymbol(nameVar, typeVar, vscode.SymbolKind.Constant, this.textSplitter.getRangeLine(start), this.textSplitter.getRangeLine(start));

            }
            this.nodes[this.nodes.length - 1].push(docSymbol);
        }
    }
    private GetVariablesInFunc(start : number, end:number) {
        for (let i = start; i <= end; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            if(lineText.match('Debug')) continue;
            let funcRegExp = this.RunRegExp(/\s*(?:const)?\s*([a-zA-Z0-9_\<\>]+)\s+([a-zA-z]\w*)/g, lineText);
            if(funcRegExp && !funcRegExp[1].match('return|case|if|else|switch|break|continue')) {
                let detail = funcRegExp[1];
                let name = funcRegExp[2];
                let docSymbol = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, this.textSplitter.getRangeLine(i), this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
            }
        }
    }
    private GetFieldsInStruct(start : number, end:number) {
        for (let i = start; i <= end; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            //поле
            let funcRegExp = this.RunRegExp(/^\s*(?:private|public|protected)?\s+(?:static)?\s*(?<const>const)?\s*(?<typeVar>[a-zA-Z0-9_<>]+)\s+(?<nameVar>\w+)\s*(?:=.*|;)/g, lineText);
            if(funcRegExp && funcRegExp.groups) {
                let typeVar = funcRegExp.groups['typeVar'];
                let nameVar = funcRegExp.groups['nameVar'];
                let docSymbol;
                if(funcRegExp.groups['const'] == undefined) {
                    docSymbol = new vscode.DocumentSymbol(nameVar, typeVar, vscode.SymbolKind.Field, this.textSplitter.getRangeLine(i), this.textSplitter.getRangeLine(i));
                }
                else {
                    docSymbol = new vscode.DocumentSymbol(nameVar, typeVar, vscode.SymbolKind.Constant, this.textSplitter.getRangeLine(i), this.textSplitter.getRangeLine(i));
                }
                this.nodes[this.nodes.length - 1].push(docSymbol);
                continue;
            }
        }
    }
    private GetLinesNumContext(lineStart: number, symbolOpen: string|RegExp, symbolClose: string|RegExp) {
        let isInsideContext = false;
        let countBrace = 0;
        let startLineBody = 0;
        for (let i = lineStart; i < this.textSplitter.lineCount; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
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
    private RunRegExp(regexp: RegExp, text: string) {
        let resultExec: RegExpExecArray | null = regexp.exec(text);
        return resultExec;
    }
}