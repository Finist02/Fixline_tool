import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlTokenizer, Token, TokensInLine } from './CtrlTokenizer';

const varTypes: string[] = [
    'blob'
    , 'bool'
    , 'void'
    , 'anytype'
    , 'mixed'
    , 'char'
    , 'double'
    , 'file'
    , 'float'
    , 'int'
    , 'uint'
    , 'long'
    , 'ulong'
    , 'string'
    , 'time'
    , 'unsigned'
    , 'dyn_blob'
    , 'dyn_bool'
    , 'dyn_char'
    , 'dyn_errClass'
    , 'short'
    , 'signed'
    , 'nullptr'
    , 'vector'
    , 'mapping'
    , 'dyn_mapping'
    , 'dyn_int'
    , 'dyn_uint'
    , 'dyn_long'
    , 'dyn_ulong'
    , 'dyn_float'
    , 'dyn_time'
    , 'dyn_string'
    , 'dyn_anytype'
    , 'dyn_dyn_anytype'
    , 'dyn_dyn_mapping'
    , 'dyn_dyn_int'
    , 'dyn_dyn_uint'
    , 'dyn_dyn_long'
    , 'dyn_dyn_ulong'
    , 'dyn_dyn_float'
    , 'dyn_dyn_time'
    , 'dyn_dyn_string'
    , 'dyn_dyn_bool'
    , 'dyn_dyn_char'
    , 'void'
    , 'langString'
    , 'dyn_langString'
];

export class CtrlSymbols {
    private userVarTypes: string[] = [];
    private symbols: vscode.DocumentSymbol[] = [];
    private nodes: Array<vscode.DocumentSymbol[]> = [this.symbols];
    private tokenizer: CtrlTokenizer;
    constructor(document: vscode.TextDocument | string) {
        this.tokenizer = new CtrlTokenizer(document);
    }

    public getAllMembers() {

    }

    public getNewTypesData() {
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            let docSymbol: undefined | vscode.DocumentSymbol = undefined;
            if (token) {
                if (token.symbol == 'class') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        docSymbol = new vscode.DocumentSymbol(nextToken.symbol, 'class', vscode.SymbolKind.Class, range, token.range);
                    }
                }
                else if (token.symbol == 'struct') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        docSymbol = new vscode.DocumentSymbol(nextToken.symbol, 'struct', vscode.SymbolKind.Struct, range, token.range);
                    }
                }
                else if (token.symbol == 'enum') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        docSymbol = new vscode.DocumentSymbol(nextToken.symbol, 'enum', vscode.SymbolKind.Enum, range, token.range);
                    }
                }
                if (docSymbol != undefined) {
                    this.symbols.push(docSymbol);
                }
            }
            token = this.tokenizer.getNextToken();
        }
        return this.symbols;
    }

    private createRange(token: Token) {
        let endClassPos = this.getRangeContext();
        if (endClassPos == undefined) return token.range;
        const range = new vscode.Range(new vscode.Position(token.range.start.line, token.range.start.character), endClassPos)
        return range;
    }

    private getRangeContext() {
        let countScope = 0;
        let startObject = false;
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            if (token.symbol == '{') {
                countScope++;
                startObject = true;
            }
            else if (token.symbol == '}') {
                countScope--;
                if (startObject && countScope == 0) {
                    startObject = false;
                    return new vscode.Position(token.range.end.line, token.range.end.character);
                }
            }
            token = this.tokenizer.getNextToken();
        }
        return undefined;
    }
}