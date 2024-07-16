import * as vscode from 'vscode';

export function GetTokens() {
    new CtrlTokenizer();
}

class TextSplitter {
    public readonly lineCount:number;
    private lines: string[];
    private text: string;
    constructor(text: string) {
        this.text = text;
        this.deleteComment();
        this.lines = this.text.split('\n');
        this.lineCount = this.lines.length;
    }
    public getTextLineAt(num: number) {
        return this.lines[num];
    }
    public getText(range: vscode.Range) {
        let text = '';
        for(let i = range.start.line; i <= range.end.line; i++) {
                text += this.lines[i];
        }
        return text;
    }
    public getRangeLine(num: number) {
        let text = this.getTextLineAt(num);
        let rangeLine = new vscode.Range(new vscode.Position(num, 0), new vscode.Position(num, text.length));
        return rangeLine;
    }

    private deleteComment() {
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
    }
}

export class CtrlTokenizer {
    private operators = ['=', "<", ">"];
    private punctuation = ['(', ')', ',', '.', ';', '<', '>'];
    private arrayText: string[] = [];
    private symbols: vscode.DocumentSymbol[] = [];
    private nodes: Array<vscode.DocumentSymbol[]> = [this.symbols];
    constructor() {
        const document = vscode.window.activeTextEditor?.document;
        if(document == undefined) return;
        let bufferToken = '';
        let docSymbol: vscode.DocumentSymbol | undefined;
        this.arrayText = document.getText().split('');
        for(let i = 0; i < this.arrayText.length; i++) {
            switch (this.arrayText[i]) {
                case ' ':
                case '\r':
                case '\n':
                case '\t':
                    if(bufferToken != '') {
                        let rangeToken = new vscode.Range(0,0,0,0);
                        docSymbol = new vscode.DocumentSymbol(bufferToken, 'Key', vscode.SymbolKind.Key, rangeToken, rangeToken);
                        this.nodes[this.nodes.length - 1].push(docSymbol);
                    }
                    bufferToken = '';
                    continue;
                case '{':
                    bufferToken = '';
                    if(docSymbol != undefined) {
                        this.nodes.push(docSymbol.children);
                    }
                    continue;
                case '}':
                    bufferToken = '';
                    if(docSymbol != undefined) {
                        this.nodes.pop();
                    }
                    continue;
                default:
                    break;
            }
            bufferToken += this.arrayText[i];
        }
        console.log(this.nodes);
    }
}