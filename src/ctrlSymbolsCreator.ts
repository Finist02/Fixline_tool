import { start } from 'repl';
import * as vscode from 'vscode';

class TextSplitter {
    private lines: string[];
    public lineCount:number;
    private text: string;
    constructor(text: string) {
        this.text = text;
        this.lines = text.split('\n');
        this.lineCount = this.lines.length;
    }
    public getTextLineAt(num: number) {
        return this.lines[num] + '\n';
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
    constructor(document: vscode.TextDocument | string) {
        if(typeof document === 'string') {
            this.textSplitter = new TextSplitter(document);
        }
        else {
            this.textSplitter = new TextSplitter(document.getText());
        }
    }
    public GetSymbols() {
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
            lineText = this.DeleteComments(lineText);
            let classRegExp = this.RunRegExp(/enum\s*(\w+)/, lineText);
			if(classRegExp) {
                let linesClass = this.GetLinesNumContext(i, '{', '}');
                let RangeClass = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesClass[1]).end);
                let docSymbol = new vscode.DocumentSymbol(classRegExp[1], 'enum', vscode.SymbolKind.Enum, RangeClass, this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
		        this.nodes.push(docSymbol.children);
                this.FindEnumMembers(linesClass[0], linesClass[1]);
                this.nodes.pop();
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
            let funcRegExp = this.RunRegExp(/^\s*(\w+)/g, lineText);
            if(funcRegExp) {
                let docSymbol = new vscode.DocumentSymbol(funcRegExp[1], 'enumMember', vscode.SymbolKind.EnumMember, this.textSplitter.getRangeLine(i), this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
                continue;
    }}}
    private GetClasses(lineNum: number) {
        for (let i = lineNum; i < this.textSplitter.lineCount; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            lineText = this.DeleteComments(lineText);
            let classRegExp = this.RunRegExp(/\s*(?:class|struct)\s+([a-zA-Z0-9_]+)/, lineText);
			if(classRegExp) {
                let linesClass = this.GetLinesNumContext(i, '{', '}');
                let RangeClass = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesClass[1]).end);
                let docSymbol = new vscode.DocumentSymbol(classRegExp[1], 'class', vscode.SymbolKind.Class, RangeClass, this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
		        this.nodes.push(docSymbol.children);
                this.FindMembersInClass(linesClass[0], linesClass[1]);
                this.nodes.pop();
                this.SetParsedLines(i, linesClass[1]);
                return  linesClass[1];                
            }
        }
        return lineNum;
    }
    private FindMembersInClass(start: number, end: number) {
        for (let i = start; i <= end; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            //поле
            let funcRegExp = this.RunRegExp(/^\s*(?:private|public|protected)\s+(?:static)?\s*(?<const>const)?\s*(?<typeVar>[a-zA-Z0-9_<>]+)\s+(?<nameVar>\w+)\s*(?:=.*|;)/g, lineText);
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
            //метод
            funcRegExp = this.RunRegExp(/\s*(?:private|public|protected)(?:\s+static)?\s+(?<typeMethod>[a-zA-Z0-9_<>]+)\s+(?<nameMethod>\w+)\s*\(/g, lineText);
            if(funcRegExp && funcRegExp.groups) {
                let typeMethod = funcRegExp.groups['typeMethod'];
                let nameMethod = funcRegExp.groups['nameMethod'];
                let linesFunc = this.GetLinesNumContext(i, '{', '}');
                let linesInnerParams = this.GetLinesNumContext(i, /\(/, /\)/);
                let RangeFunc = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesFunc[1]).end);
                let docSymbol = new vscode.DocumentSymbol(nameMethod, typeMethod, vscode.SymbolKind.Method, RangeFunc, RangeFunc);
                this.nodes[this.nodes.length - 1].push(docSymbol);
		        this.nodes.push(docSymbol.children);
                this.GetParamsFunc(linesInnerParams[0], linesInnerParams[1]);
                this.GetVariablesInFunc(linesFunc[0], linesFunc[1]);
                this.nodes.pop();
                continue;
            }
            //конструктор
            funcRegExp = this.RunRegExp(/\s*public\s+(\w+)\s*\(/g, lineText);
            if(funcRegExp) {
                let detail = 'constructor';
                let name = funcRegExp[1];
                let linesInnerParams = this.GetLinesNumContext(i, /\(/, /\)/);
                let linesFunc = this.GetLinesNumContext(i, '{', '}');
                let RangeFunc = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesFunc[1]).end);
                let docSymbol = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Constructor, RangeFunc, this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
		        this.nodes.push(docSymbol.children);
                this.GetParamsFunc(linesInnerParams[0], linesInnerParams[1]);
                this.GetVariablesInFunc(linesFunc[0], linesFunc[1]);
                this.nodes.pop();
                continue;
            }
        }
    }
    private SetParsedLines(start: number, end: number) {
        for (let i = start; i <= end; i++) {
            this.parsedLines.push(i);
        }
    }
    private GetFunctions(lineNum: number) {
        for (let i = lineNum; i < this.textSplitter.lineCount; i++) {
            if(this.parsedLines.indexOf(i) != -1) {continue;}
            let lineText = this.textSplitter.getTextLineAt(i);
            if(lineText.startsWith('//')) continue;
            lineText = this.DeleteComments(lineText);
            let funcRegExp = this.RunRegExp(/\s*([a-zA-z0-9_\<\>]+)\s+(\w+)s*\(/, lineText);
            if(funcRegExp) {
                let detail = funcRegExp[1];
                let name = funcRegExp[2];
                let linesFunc = this.GetLinesNumContext(i, '{', '}');
                let linesInnerParams = this.GetLinesNumContext(i, /\(/, /\)/);
                let RangeFunc = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesFunc[1]).end);
                let docSymbol = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Function, RangeFunc, this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
		        this.nodes.push(docSymbol.children);
                this.GetParamsFunc(linesInnerParams[0], linesInnerParams[1]);
                this.GetVariablesInFunc(linesFunc[0], linesFunc[1]);
                this.nodes.pop();
                this.SetParsedLines(i, linesFunc[1]);
                return  linesFunc[1];
            }
            else {
                funcRegExp = this.RunRegExp(/main\s*\(.*\)\s*/, lineText);
                if(funcRegExp) {
                    let linesInnerParams = this.GetLinesNumContext(i, /\(/, /\)/);
                    let linesFunc = this.GetLinesNumContext(i, '{', '}');
                    let RangeFunc = new vscode.Range(this.textSplitter.getRangeLine(i).start, this.textSplitter.getRangeLine(linesFunc[1]).end);
                    let docSymbol = new vscode.DocumentSymbol('main', 'void', vscode.SymbolKind.Function, RangeFunc, this.textSplitter.getRangeLine(i));
                    this.nodes[this.nodes.length - 1].push(docSymbol);
                    this.nodes.push(docSymbol.children);
                    this.GetParamsFunc(linesInnerParams[0], linesInnerParams[1]);
                    this.GetVariablesInFunc(linesFunc[0], linesFunc[1]);
                    this.nodes.pop();
                    this.SetParsedLines(i, linesFunc[1]);
                    return  linesFunc[1];
                }
            }
        }
        return lineNum;
    }
    private GetParamsFunc(start: number, end: number) {
        let textParams = '';
        for (let i = start; i <= end; i++) {
            let lineText = this.textSplitter.getTextLineAt(i);
            textParams += lineText + '\n';
        }
        let regexp = /\s*(?<const>const)?\s*(?<typeVar>[a-zA-Z0-9_\<\>]+)\s+(?<nameVar>&?[a-zA-z]\w*),?/gs;
        let result = regexp.exec(textParams); //пропускаем имя функции
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
            let funcRegExp = this.RunRegExp(/\s*([a-zA-Z0-9_\<\>]+)\s+([a-zA-z]\w*)/g, lineText);
            if(funcRegExp && !funcRegExp[1].match('return') && !funcRegExp[1].match('case')) {
                let detail = funcRegExp[1];
                let name = funcRegExp[2];
                let docSymbol = new vscode.DocumentSymbol(name, detail, vscode.SymbolKind.Variable, this.textSplitter.getRangeLine(i), this.textSplitter.getRangeLine(i));
                this.nodes[this.nodes.length - 1].push(docSymbol);
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
    private DeleteComments(lineText: string) {
        let commentRegExp = this.RunRegExp(this.comment, lineText);
        if(commentRegExp) {
            lineText = lineText.replace(commentRegExp[1], ' '.repeat(commentRegExp[1].length));     
        }
        return lineText;
    }
    private RunRegExp(regexp: RegExp, text: string) {
        let resultExec: RegExpExecArray | null = regexp.exec(text);
        return resultExec;
    }
}