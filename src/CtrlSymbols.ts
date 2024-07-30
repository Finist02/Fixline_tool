import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlTokenizer, Token, TokensInLine } from './CtrlTokenizer';
import { GetProjectsInConfigFile } from './ctrlComands';
import { varTypes } from './CtrlVarTypes';


export function CtrlGetAllmembers() {
    try {
        const doc = vscode.window.activeTextEditor?.document;
        if (doc) {
            const symbols = new CtrlAllSymbols(doc);
            symbols.getAllMembers();

        }

    } catch (error) {
        console.log(error);
    }
}
export class CtrlSymbols {
    protected userVarTypes: string[] = [];
    protected symbols: vscode.DocumentSymbol[] = [];
    protected nodes: Array<vscode.DocumentSymbol[]> = [this.symbols];
    protected tokenizer: CtrlTokenizer;
    private innersFilesRead: number;
    static filesRead: string[] = [];
    constructor(document: vscode.TextDocument | string, innersFilesRead: number = 0) {
        this.tokenizer = new CtrlTokenizer(document);
        this.innersFilesRead = innersFilesRead;
    }

    public getNewTypesData() {
        if (this.innersFilesRead < 1) return this.symbols;
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            let docSymbol: undefined | vscode.DocumentSymbol = undefined;
            if (token) {
                if (token.symbol == '#uses') {
                    const library = this.getUsesExistingPath();
                    if(library != '') {
                        this.appendUserVarTypesFromFile(library);
                    }
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

    protected getUsesExistingPath() {
        if (this.innersFilesRead < 1) return '';
        if (this.tokenizer == undefined) return '';
        let tokenLibrary = this.tokenizer.getNextToken();
        if (tokenLibrary == null) return '';
        const findLibrary = tokenLibrary.symbol.slice(1, tokenLibrary.symbol.length - 1);
        if (!(tokenLibrary.symbol.startsWith('"') && tokenLibrary.symbol.endsWith('"'))) {
            return '';
        }
        else {
            let paths = GetProjectsInConfigFile();
            for (let j = paths.length - 1; j >= 0; j--) {
                const path1 = paths[j] + '/scripts/libs/' + findLibrary + '.ctl';
                const path2 = paths[j] + '/scripts/libs/' + findLibrary;
                if (fs.existsSync(path1) && CtrlSymbols.filesRead.indexOf(path1) < 0) {
                    return path1;
                }
                else if (fs.existsSync(path2) && CtrlSymbols.filesRead.indexOf(path1) < 0) {
                    return path2;
                }
            }
        }
        return '';
    }

    protected appendUserVarTypesFromFile(path: string) {
        try {
            let fileData = fs.readFileSync(path, 'utf8');
            CtrlSymbols.filesRead.push(path);
            const symbols = new CtrlSymbols(fileData, this.innersFilesRead - 1);
            this.symbols = this.symbols.concat(symbols.getNewTypesData());
        } catch (error) {
            console.log(path);
        }
    }

    protected getVarType(nextToken: Token | null = null) {
        if (nextToken == null) {
            nextToken = this.tokenizer.getNextToken();
        }
        if (nextToken) {
            if (nextToken.symbol == 'static') {
                nextToken = this.tokenizer.getNextToken();
                if (!nextToken) return null;
            }
            if (nextToken.symbol == 'const') {
                nextToken = this.tokenizer.getNextToken();
                if (!nextToken) return null;
            }
            if (this.isDeclarVariable(nextToken) != null) {
                return nextToken;
            }
            else if (this.tokenizer.getNextToken()?.symbol == '(') {
                this.tokenizer.backToken();
                return nextToken;
            }
            else {
            }
        }
        return null;
    }

    protected isDeclarVariable(token: Token) {
        this.tokenizer.backToken();
        this.tokenizer.backToken();
        const prevToken = this.tokenizer.getNextToken();
        this.tokenizer.getNextToken();
        if (prevToken?.symbol == 'new') {
            return null;
        }
        if (token.symbol == 'shared_ptr') {
            this.checkSharedPtr(token);
            return 'shared_ptr';
        }
        else if (token.symbol == 'vector') {
            this.checkSharedPtr(token);
            return 'vector';
        }
        else if (varTypes.indexOf(token.symbol) > -1 || this.userVarTypes.indexOf(token.symbol) > -1) {
            const nextToken = this.tokenizer.getNextToken();
            this.tokenizer.backToken();
            if (nextToken?.symbol == ')' || nextToken?.symbol == ':') {
                return null;
            }
            return token.symbol;
        }
        return null;
    }

    private checkSharedPtr(token: Token) {
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken && nextToken.symbol == '<') {
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                if (this.isDeclarVariable(nextToken)) {
                    nextToken = this.tokenizer.getNextToken();
                    if (nextToken && nextToken.symbol == '>') {
                        return;
                    }
                }
                else {
                    return;
                }
            }
        }
    }
}

class CtrlAllSymbols extends CtrlSymbols {
    public getAllMembers() {
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            if (token) {
                if (token.symbol == '#uses') {
                    const library = this.getUsesExistingPath();
                    if(library != '') {
                        this.appendUserVarTypesFromFile(library);
                    }
                }
                else if (token.symbol == 'class') {
                    this.addClass(token);
                }
                else if (token.symbol == 'struct') {
                    this.addStruct(token);
                }
                else if (token.symbol == 'enum') {
                    this.addEnum(token);
                }
            }
            token = this.tokenizer.getNextToken();
        }
        return this.symbols;
    }
    private addClass(token: Token) {
        let classNameToken = this.tokenizer.getNextToken();
        if (classNameToken) {
            let docSymbol = new vscode.DocumentSymbol(classNameToken.symbol, 'class', vscode.SymbolKind.Class, token.range, token.range);
            this.nodes[this.nodes.length - 1].push(docSymbol);
            this.nodes.push(docSymbol.children);
            let nextToken = this.tokenizer.getNextToken();
            if (nextToken?.symbol != ':') {  //унаследован
                this.tokenizer.backToken();
                // проверить родительский
            }
            try {
                this.tokenizer.getNextToken();
                this.addMembers(classNameToken);
            } catch (error) {
                console.log(error);
            }
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                docSymbol.range = new vscode.Range(docSymbol.range.start, nextToken.range.end);
            }
            this.nodes.pop();
        }
        else {
            this.tokenizer.backToken();
        }
    }
    private addStruct(token: Token) {
        let classNameToken = this.tokenizer.getNextToken();
        if (classNameToken) {
            let docSymbol = new vscode.DocumentSymbol(classNameToken.symbol, 'struct', vscode.SymbolKind.Struct, token.range, token.range);
            this.nodes[this.nodes.length - 1].push(docSymbol);
            this.nodes.push(docSymbol.children);
            let nextToken = this.tokenizer.getNextToken();
            if (nextToken?.symbol != ':') {  //унаследован
                this.tokenizer.backToken();
                // проверить родительский
            }
            try {
                this.tokenizer.getNextToken();
                this.addMembers(classNameToken);
            } catch (error) {
                console.log(error);
            }
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                docSymbol.range = new vscode.Range(docSymbol.range.start, nextToken.range.end);
            }
            this.nodes.pop();
        }
        else {
            this.tokenizer.backToken();
        }
    }

    private addEnum(token: Token) {
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken) {
            let docSymbol = new vscode.DocumentSymbol(nextToken.symbol, 'enum', vscode.SymbolKind.Enum, token.range, token.range);
            this.tokenizer.getNextToken();
            this.nodes[this.nodes.length - 1].push(docSymbol);
            this.nodes.push(docSymbol.children);
            this.addEnumMembers();
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                docSymbol.range = new vscode.Range(docSymbol.range.start, nextToken.range.end);
            }
            this.nodes.pop();
        }
    }
    private addMembers(classNameToken: Token) {
        let member = this.tokenizer.getNextToken();
        while (member != null) {
            if (member.symbol == 'public' || member.symbol == 'private' || member.symbol == 'protected') {
                let typeMemberToken = this.getVarType();
                if (typeMemberToken) {
                    let memberName = null;
                    if (classNameToken.symbol == typeMemberToken.symbol) { //constructor
                        memberName = typeMemberToken;
                        const nextToken = this.tokenizer.getNextToken();
                        if (nextToken?.symbol == '(') {
                            let symbolMember = new vscode.DocumentSymbol(memberName.symbol, member.symbol, vscode.SymbolKind.Constructor, memberName.range, memberName.range);
                            this.nodes[this.nodes.length - 1].push(symbolMember);
                            const rangeEnd = this.checkFunction(memberName);
                            if (rangeEnd) {
                                symbolMember.range = new vscode.Range(memberName.range.start, rangeEnd);
                            }
                        }
                    }
                    else {
                        memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                let symbolMember = new vscode.DocumentSymbol(memberName.symbol, typeMemberToken.symbol, vscode.SymbolKind.Method, memberName.range, memberName.range);
                                this.nodes[this.nodes.length - 1].push(symbolMember);
                                const rangeEnd = this.checkFunction(memberName);
                                if (rangeEnd) {
                                    symbolMember.range = new vscode.Range(memberName.range.start, rangeEnd);
                                }

                            }
                            else {
                                this.tokenizer.backToken();
                                this.checkVaribles(memberName, typeMemberToken.symbol);
                            }
                        }
                    }
                }
            }
            else if (member.symbol == '}') {
                return;
            }
            else if (member.symbol != ';' && !member.symbol.startsWith('/')) { // not write private
                if (member.symbol == 'static') {
                    member = this.tokenizer.getNextToken();
                }
                if (member?.symbol == 'const') {
                    member = this.tokenizer.getNextToken();
                }
                if (member) {
                    const varType = this.isDeclarVariable(member);
                    if (varType) {
                        this.checkMember(varType);
                    }
                }
            }
            member = this.tokenizer.getNextToken();
        }
    }
    private checkMember(varType: string) {
        const member = this.tokenizer.getNextToken();
        if (member?.symbol == '(') {
            let symbolMember = new vscode.DocumentSymbol(member.symbol, varType, vscode.SymbolKind.Method, member.range, member.range);
            this.nodes[this.nodes.length - 1].push(symbolMember);
            const rangeEnd = this.checkFunction(member);
            if (rangeEnd) {
                symbolMember.range = new vscode.Range(member.range.start, rangeEnd);
            }

        }
        else if (member) {
            this.tokenizer.backToken();
            this.checkVaribles(member, varType);
        }
    }
    private addEnumMembers() {
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            if (token.symbol == '}') {
                break;
            }
            else if (token.symbol == ',') {
                token = this.tokenizer.getNextToken();
                continue;
            }
            else {
                let symbolMember = new vscode.DocumentSymbol(token.symbol, 'enumMember', vscode.SymbolKind.EnumMember, token.range, token.range);
                this.nodes[this.nodes.length - 1].push(symbolMember);
            }
            token = this.tokenizer.getNextToken();
        }
        if (token) {
            return token.range;
        }
        return null;
    }
    private checkFunction(memberName: Token) {
        let token = this.tokenizer.getNextToken();
        let countScopes = 1;
        this.nodes.push(this.nodes[this.nodes.length - 1][this.nodes[this.nodes.length - 1].length - 1].children);
        while (countScopes != 0) {
            if (token?.symbol == ')') {
                countScopes--;
            }
            else if (token?.symbol == '(') {
                countScopes++;
            }
            else if (token) {
                const varType = this.isDeclarVariable(token);
                if (varType) {
                    token = this.tokenizer.getNextToken();
                    if (token) {
                        this.checkParameters(token, varType);
                    }
                }
            }
            token = this.tokenizer.getNextToken();
        }
        if (token == null) return null;
        if (token?.symbol == ':') {
            token = this.tokenizer.getNextToken();
            while (token && token.symbol != '{') {
                token = this.tokenizer.getNextToken();

            }
        }
        if (token?.symbol == '{') {
            try {
                return this.checkBodyFunction();
            } catch (error) {
                console.log(error);
            }
        }
        else {
        }
        return null;
    }

    private checkVaribles(memberName: Token, detial: string = 'var') {
        this.addVariable(memberName, detial);
        let nextToken = this.tokenizer.getNextToken();
        while (nextToken?.symbol == ',') {
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                this.addVariable(nextToken, detial);
            }
            nextToken = this.tokenizer.getNextToken();
        }
        this.tokenizer.backToken();
    }
    private addVariable(variable: Token, detial: string = 'var') {
        this.nodes[this.nodes.length - 1].push(new vscode.DocumentSymbol(variable.symbol, detial, vscode.SymbolKind.Field, variable.range, variable.range));
        return true;
    }
    private checkParameters(token: Token, varType: string) {
        if (token) {
            if (token.symbol == '&') {
                let nextToken = this.tokenizer.getNextToken();
                if (nextToken) {
                    this.addVariable(nextToken, varType);
                }
            }
            else {
                this.addVariable(token, varType);
            }
        }
    }

    private checkBodyFunction() {
        let countScopes = 1;
        let token = this.tokenizer.getNextToken();
        let rangeFunc = null;
        while (countScopes != 0) {
            if (token?.symbol == '{') {
                countScopes++;
                let docSymbol = new vscode.DocumentSymbol(token.symbol, '{', vscode.SymbolKind.Operator, token.range, token.range);
                this.nodes[this.nodes.length - 1].push(docSymbol);
                this.nodes.push(docSymbol.children);
            }
            else if (token?.symbol == '}') {
                countScopes--;
                if (countScopes == 0) {
                    rangeFunc = token.range.end;
                }
                this.popNodesFunction();

            }
            else if (token?.symbol == 'for') {
                this.checkForExpression(token);
            }
            else if (token) {
                const varType = this.isDeclarVariable(token);
                if (varType) {
                    token = this.tokenizer.getNextToken();
                    if (token) {
                        this.checkVaribles(token, varType);
                    }
                }
                else {
                }
            }
            token = this.tokenizer.getNextToken();
        }
        this.tokenizer.backToken();
        return rangeFunc;
    }
    private checkForExpression(forOperator: Token) {
        this.tokenizer.getNextToken();
        let token = this.tokenizer.getNextToken();
        let countScopes = 1;
        let docSymbol = new vscode.DocumentSymbol(forOperator.symbol, 'for', vscode.SymbolKind.Operator, forOperator.range, forOperator.range);
        this.nodes[this.nodes.length - 1].push(docSymbol);
        this.nodes.push(docSymbol.children);
        while (countScopes != 0) {
            if (token?.symbol == ')') {
                countScopes--;
            }
            else if (token?.symbol == '(') {
                countScopes++;
            }
            else if (token) {
                const varType = this.isDeclarVariable(token);
                if (varType) {
                    token = this.tokenizer.getNextToken();
                    if (token) {
                        this.checkParameters(token, varType);
                    }
                }
                else {
                }
            }
            token = this.tokenizer.getNextToken();
        }
        if (token == null) return;
        if (token?.symbol == '{') {
            try {
                this.checkBodyFunction();
            } catch (error) {
                console.log(error);
            }
        }
        else {
            this.popNodesFunction();
        }
    }
    private popNodesFunction() {
        const docSymbols = this.nodes[this.nodes.length - 1];
        docSymbols.forEach(symbol => {
            if (symbol.name != 'for' && symbol.name != '{' && symbol.detail != 'readed') {
            }
        });
        this.nodes.pop();
    }
}
