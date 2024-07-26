import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlTokenizer, Token, TokensInLine } from './CtrlTokenizer';
import { GetProjectsInConfigFile } from './ctrlComands';
export class CtrlSymbols {
    private userVarTypes: string[] = [];
    private symbols: vscode.DocumentSymbol[] = [];
    private nodes: Array<vscode.DocumentSymbol[]> = [this.symbols];
    private tokenizer: CtrlTokenizer;
    private innersFilesRead: number;
    static filesRead: string[] = [];
    constructor(document: vscode.TextDocument | string, innersFilesRead: number = 0) {
        this.tokenizer = new CtrlTokenizer(document);
        this.innersFilesRead = innersFilesRead;
    }

    public getAllMembers() {

    }

    public getNewTypesData() {
        if (this.innersFilesRead < 1) return this.symbols;
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            let docSymbol: undefined | vscode.DocumentSymbol = undefined;
            if (token) {
                if (token.symbol == '#uses') {
                    this.checkUsesExistingPath();
                }
                else if (token.symbol == 'class') {
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
    private checkUsesExistingPath() {
        if (this.innersFilesRead < 1) return;
        if (this.tokenizer == undefined) return;
        let tokenLibrary = this.tokenizer.getNextToken();
        if (tokenLibrary == null) return;
        const findLibrary = tokenLibrary.symbol.slice(1, tokenLibrary.symbol.length - 1);
        if (!(tokenLibrary.symbol.startsWith('"') && tokenLibrary.symbol.endsWith('"'))) {
            return;
        }
        else {
            let paths = GetProjectsInConfigFile();
            for (let j = paths.length - 1; j >= 0; j--) {
                const path1 = paths[j] + '/scripts/libs/' + findLibrary + '.ctl';
                const path2 = paths[j] + '/scripts/libs/' + findLibrary;
                if (fs.existsSync(path1) && CtrlSymbols.filesRead.indexOf(path1) < 0) {
                    this.appendUserVarTypesFromFile(path1);
                    break;
                }
                else if (fs.existsSync(path2) && CtrlSymbols.filesRead.indexOf(path1) < 0) {
                    this.appendUserVarTypesFromFile(path2);
                    break;
                }
            }
        }
    }
    private appendUserVarTypesFromFile(path: string) {
        CtrlSymbols.filesRead.push(path);
        let fileData = fs.readFileSync(path, 'utf8');
        const symbols = new CtrlSymbols(fileData, this.innersFilesRead - 1);
        this.symbols = this.symbols.concat(symbols.getNewTypesData());
    }
}