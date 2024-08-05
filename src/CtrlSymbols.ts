import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlTokenizer, Token, TokensInLine } from './CtrlTokenizer';
import { GetProjectsInConfigFile } from './ctrlComands';
import { varTypes } from './CtrlVarTypes';
import { DocumentSymbol } from 'vscode';

export enum SymbolModifiers {
    Const = 1,
    Vector = 2,
    Shared_ptr = 3,
    Static = 4,
    Global = 5
}

export class CtrlDocumentSymbol extends DocumentSymbol {
    modifiers?: readonly SymbolModifiers[];
}
export function CtrlGetAllmembers() {
    try {
        const doc = vscode.window.activeTextEditor?.document;
        if (doc) {
            const symbols = new CtrlAllSymbols(doc, 0);
            console.log(symbols.getAllMembers());
        }

    } catch (error) {
        console.log(error);
    }
}
export class CtrlSymbols {
    protected userVarTypes: string[] = [];
    protected symbols: CtrlDocumentSymbol[] = [];
    protected nodes: Array<CtrlDocumentSymbol[]> = [this.symbols];
    protected tokenizer: CtrlTokenizer;
    protected innersFilesRead: number;
    protected filesRead: string[] = [];
    constructor(document: vscode.TextDocument | string, innersFilesRead: number = 0, tokenizer: CtrlTokenizer | null = null) {
        if (tokenizer != null) {
            this.tokenizer = tokenizer;
            this.tokenizer.resetIndexTokens();
        }
        else {
            this.tokenizer = new CtrlTokenizer(document);
        }
        this.innersFilesRead = innersFilesRead;
    }

    public getNewTypesData(filesRead: string[] = []) {
        this.filesRead = filesRead;
        if (this.innersFilesRead < 1) return this.symbols;
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            let docSymbol: undefined | CtrlDocumentSymbol = undefined;
            if (token) {
                if (token.symbol == '#uses') {
                    const library = this.getUsesExistingPath();
                    if (library != '') {
                        this.getUserVarTypesFromFile(library);
                    }
                }
                else if (token.symbol == 'class') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        docSymbol = new CtrlDocumentSymbol(nextToken.symbol, 'class', vscode.SymbolKind.Class, range, token.range);
                    }
                }
                else if (token.symbol == 'struct') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        docSymbol = new CtrlDocumentSymbol(nextToken.symbol, 'struct', vscode.SymbolKind.Struct, range, token.range);
                    }
                }
                else if (token.symbol == 'enum') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        docSymbol = new CtrlDocumentSymbol(nextToken.symbol, 'enum', vscode.SymbolKind.Enum, range, token.range);
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

    protected createRange(token: Token) {
        let endClassPos = this.getRangeContext();
        if (endClassPos == undefined) return token.range;
        const range = new vscode.Range(new vscode.Position(token.range.start.line, token.range.start.character), endClassPos)
        return range;
    }

    protected getRangeContext() {
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

    protected getUsesExistingPath(checkReadingFiles: boolean = true) {
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
                if (fs.existsSync(path1) && (!checkReadingFiles || this.filesRead.indexOf(path1) < 0)) {
                    return path1;
                }
                else if (fs.existsSync(path2) && (!checkReadingFiles || this.filesRead.indexOf(path1) < 0)) {
                    return path2;
                }
            }
        }
        return '';
    }

    protected appendUserVarTypesFromFile(path: string) {
        try {
            let fileData = fs.readFileSync(path, 'utf8');
            this.filesRead.push(path);
            const symbols = new CtrlSymbols(fileData, this.innersFilesRead - 1);
            const libSymbols = symbols.getNewTypesData(this.filesRead);
            for (let i = 0; i < libSymbols.length; i++) {
                this.userVarTypes.push(libSymbols[i].name);
            }
        } catch (error) {
            console.log(path);
        }
    }

    protected addEnum() {
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken) {
            let docSymbol = new CtrlDocumentSymbol(nextToken.symbol, 'enum', vscode.SymbolKind.Enum, nextToken.range, nextToken.range);
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
                let symbolMember = new CtrlDocumentSymbol(token.symbol, 'enumMember', vscode.SymbolKind.EnumMember, token.range, token.range);
                this.nodes[this.nodes.length - 1].push(symbolMember);
            }
            token = this.tokenizer.getNextToken();
        }
        if (token) {
            return token.range;
        }
        return null;
    }

    protected getVarType(nextToken: Token | null = null) {
        if (nextToken == null) { // why??
            nextToken = this.tokenizer.getNextToken();
        }
        let isConst = false;
        let isStatic = false;
        if (nextToken) {
            if (nextToken.symbol == 'global') {
                nextToken = this.tokenizer.getNextToken();
                if (!nextToken) return null;
            }
            if (nextToken.symbol == 'static') {
                nextToken = this.tokenizer.getNextToken();
                isStatic = true;
                if (!nextToken) return null;
            }
            if (nextToken.symbol == 'const') {
                nextToken = this.tokenizer.getNextToken();
                isConst = true;
                if (!nextToken) return null;
            }
            let typeVariable = this.isDeclarVariable(nextToken);
            if (typeVariable != null) {
                nextToken.isStatic = isStatic;
                nextToken.isConst = isConst;
                if (nextToken.symbol == 'shared_ptr') {
                    this.tokenizer.getNextToken();
                }
                else if (nextToken.symbol == 'vector') {
                    this.tokenizer.getNextToken();
                }
                return nextToken;
            }
            else if (this.nodes.length > 1) { //constructor no type
                if (this.nodes[this.nodes.length - 2][this.nodes[this.nodes.length - 2].length - 1].name == nextToken.symbol) {
                    return nextToken;
                }
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
            return this.checkSharedPtr();
        }
        else if (token.symbol == 'vector') {
            return this.checkSharedPtr();
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

    private checkSharedPtr(): null | string {
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken && nextToken.symbol == '<') {
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                const typeVar = this.isDeclarVariable(nextToken);
                if (this.isDeclarVariable(nextToken)) {
                    nextToken = this.tokenizer.getNextToken();
                    if (nextToken && nextToken.symbol == '>') {
                        this.tokenizer.getNextToken();
                        return typeVar;
                    }
                    return null;
                }
                else {
                    return null;
                }
            }
        }
        return null;
    }

    private getUserVarTypesFromFile(path: string) {
        try {
            let fileData = fs.readFileSync(path, 'utf8');
            this.filesRead.push(path);
            const symbols = new CtrlSymbols(fileData, this.innersFilesRead - 1);
            const libSymbols = symbols.getNewTypesData(this.filesRead);
            for (let i = 0; i < libSymbols.length; i++) {
                this.symbols.push(libSymbols[i]);

            }
        } catch (error) {
            console.log(path);
        }
    }
}


export class CtrlConstantsSymbols extends CtrlSymbols {
    public getConstantsAndNewVars(filesRead: string[] = []) {
        this.filesRead = filesRead;
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            if (token) {
                if (token.symbol == '#uses') {
                    const library = this.getUsesExistingPath();
                    if (library != '') {
                        this.appendNewVarsFromFile(library);
                    }
                }
                else if (token.symbol == 'class' || token.symbol == 'struct' || token.symbol == 'enum') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        let docSymbol = new CtrlDocumentSymbol(nextToken.symbol, 'class', vscode.SymbolKind.Class, range, token.range);
                        this.symbols.push(docSymbol);
                    }
                }
                else {
                    token = this.getVarType(token);
                    if (token) {
                        let memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                this.getRangeContext();
                            }
                            else {
                                if (token.isConst) {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, token.symbol, vscode.SymbolKind.Constant, memberName.range, memberName.range);
                                    this.symbols.push(symbolMember);
                                }
                            }
                        }
                    }
                }
            }
            token = this.tokenizer.getNextToken();
        }
        return this.symbols;
    }

    private appendNewVarsFromFile(path: string) {
        try {
            let fileData = fs.readFileSync(path, 'utf8');
            this.filesRead.push(path);
            const publicSymbols = new CtrlConstantsSymbols(fileData, this.innersFilesRead - 1);
            const libSymbols = publicSymbols.getConstantsAndNewVars(this.filesRead);
            for (let i = 0; i < libSymbols.length; i++) {
                this.symbols.push(libSymbols[i]);

            }
        } catch (error) {
            console.log(path);
        }
    }
}

export class CtrlAllSymbols extends CtrlSymbols {
    public getAllMembers() {
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            if (token) {
                if (token.symbol == '#uses') {
                    const library = this.getUsesExistingPath(false);
                    if (library != '') {
                        this.appendUserVarTypesFromFile(library);
                    }
                }
                else if (token.symbol == 'class') {
                    this.addClass();
                }
                else if (token.symbol == 'struct') {
                    this.addStruct();
                }
                else if (token.symbol == 'enum') {
                    this.addEnum();
                }
                else {
                    this.checkFunctionOrVar();
                }

            }
            token = this.tokenizer.getNextToken();
        }
        return this.symbols;
    }

    private addClass() {
        let classNameToken = this.tokenizer.getNextToken();
        if (classNameToken) {
            let docSymbol = new CtrlDocumentSymbol(classNameToken.symbol, 'class', vscode.SymbolKind.Class, classNameToken.range, classNameToken.range);
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
                docSymbol.selectionRange = new vscode.Range(docSymbol.range.start, nextToken.range.end);
            }
            this.nodes.pop();
        }
        else {
            this.tokenizer.backToken();
        }
    }

    private addStruct() {
        let classNameToken = this.tokenizer.getNextToken();
        if (classNameToken) {
            let docSymbol = new CtrlDocumentSymbol(classNameToken.symbol, 'struct', vscode.SymbolKind.Struct, classNameToken.range, classNameToken.range);
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
                docSymbol.selectionRange = new vscode.Range(docSymbol.range.start, nextToken.range.end);
            }
            this.nodes.pop();
        }
        else {
            this.tokenizer.backToken();
        }
    }

    private checkFunctionOrVar() {
        this.tokenizer.backToken();
        let typeMemberToken = this.getVarType();
        if (typeMemberToken) {
            const memberName = this.tokenizer.getNextToken();
            if (memberName) {
                if (this.tokenizer.getNextToken()?.symbol == '(') {
                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, typeMemberToken.symbol, vscode.SymbolKind.Function, memberName.range, memberName.range);
                    symbolMember.modifiers = [SymbolModifiers.Const];
                    this.nodes[this.nodes.length - 1].push(symbolMember);
                    const rangeEnd = this.checkFunction(memberName);
                    if (rangeEnd) {
                        symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                    }

                }
                else {
                    this.tokenizer.backToken();
                    if (typeMemberToken.isConst) {
                        this.addVaribles(memberName, typeMemberToken.symbol, vscode.SymbolKind.Constant);
                    }
                    else {
                        this.addVaribles(memberName, typeMemberToken.symbol);
                    }
                }
            }
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
                            let symbolMember = new CtrlDocumentSymbol(memberName.symbol, member.symbol, vscode.SymbolKind.Constructor, memberName.range, memberName.range);
                            this.nodes[this.nodes.length - 1].push(symbolMember);
                            const rangeEnd = this.checkFunction(memberName);
                            if (rangeEnd) {
                                symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                            }
                        }
                    }
                    else {
                        memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                let symbolMember = new CtrlDocumentSymbol(memberName.symbol, typeMemberToken.symbol, vscode.SymbolKind.Method, memberName.range, memberName.range);
                                this.nodes[this.nodes.length - 1].push(symbolMember);
                                const rangeEnd = this.checkFunction(memberName);
                                if (rangeEnd) {
                                    symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                                }

                            }
                            else {
                                this.tokenizer.backToken();
                                if (typeMemberToken.isConst) {
                                    this.addVaribles(memberName, typeMemberToken.symbol, vscode.SymbolKind.Constant);
                                }
                                else {
                                    this.addVaribles(memberName, typeMemberToken.symbol);
                                }
                            }
                        }
                    }
                }
            }
            else if (member.symbol == '}') {
                return;
            }
            else if (member.symbol != ';' && !member.symbol.startsWith('/')) { // not write private
                let isConst = false;
                let isStatic = false;
                if (member.symbol == 'static') {
                    isStatic = true;
                    member = this.tokenizer.getNextToken();
                }
                if (member?.symbol == 'const') {
                    isConst = true;
                    member = this.tokenizer.getNextToken();
                }
                if (member) {
                    const varType = this.isDeclarVariable(member);
                    if (varType) {
                        member.isStatic = isStatic;
                        member.isConst = isConst;
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
            let symbolMember = new CtrlDocumentSymbol(member.symbol, varType, vscode.SymbolKind.Method, member.range, member.range);
            this.nodes[this.nodes.length - 1].push(symbolMember);
            const rangeEnd = this.checkFunction(member);
            if (rangeEnd) {
                symbolMember.selectionRange = new vscode.Range(member.range.start, rangeEnd);
            }

        }
        else if (member) {
            this.tokenizer.backToken();
            this.addVaribles(member, varType);
        }
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
        if (token?.symbol.startsWith('//') || token?.symbol.startsWith('/*')) {
            token = this.tokenizer.getNextToken();
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

    private addVaribles(memberName: Token, detial: string = 'var', symbolKind: vscode.SymbolKind = vscode.SymbolKind.Variable) {
        this.addVariable(memberName, detial, symbolKind);
        let nextToken = this.tokenizer.getNextToken();
        while (nextToken?.symbol == ',') {
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                this.addVariable(nextToken, detial, symbolKind);
            }
            nextToken = this.tokenizer.getNextToken();
        }
        this.tokenizer.backToken();
    }

    private addVariable(variable: Token, detial: string = 'var', symbolKind: vscode.SymbolKind = vscode.SymbolKind.Variable) {
        this.nodes[this.nodes.length - 1].push(new CtrlDocumentSymbol(variable.symbol, detial, symbolKind, variable.range, variable.range));
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
                let docSymbol = new CtrlDocumentSymbol(token.symbol, '{', vscode.SymbolKind.Operator, token.range, token.range);
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
                        this.addVaribles(token, varType);
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
        let docSymbol = new CtrlDocumentSymbol(forOperator.symbol, 'for', vscode.SymbolKind.Operator, forOperator.range, forOperator.range);
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


























/**
 * -------------------------------------------------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------------------------------------
 * -------------------------------------------------------------------------------------------------------------------------------------------------
 */
export class CtrlPublicSymbols extends CtrlSymbols {
    public getPublicMembers(filesRead: string[] = []) {
        this.filesRead = filesRead;
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            if (token) {
                if (token.symbol == '#uses') {
                    const library = this.getUsesExistingPath();
                    if (library != '') {
                        this.appendPublicMembersFromFile(library);
                    }
                }
                else if (token.symbol == 'class') {
                    this.addClass(token);
                }
                else if (token.symbol == 'struct') {
                    // this.addStruct(token);
                }
                else if (token.symbol == 'enum') {
                    this.addEnum();
                }
                else {
                    token = this.getVarType(token);
                    if (token) {
                        let memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                let symbolMember = new CtrlDocumentSymbol(memberName.symbol, token.symbol, vscode.SymbolKind.Function, memberName.range, memberName.range);
                                this.nodes[this.nodes.length - 1].push(symbolMember);
                                const rangeEnd = this.getRangeContext();
                                if (rangeEnd) {
                                    symbolMember.range = new vscode.Range(memberName.range.start, rangeEnd);
                                }
                            }
                            else {
                                if (token.isConst) {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, token.symbol, vscode.SymbolKind.Constant, memberName.range, memberName.range);
                                    this.nodes[this.nodes.length - 1].push(symbolMember);
                                }
                                else {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, token.symbol, vscode.SymbolKind.Variable, memberName.range, memberName.range);
                                    this.nodes[this.nodes.length - 1].push(symbolMember);
                                }
                            }
                        }
                    }
                }
            }
            token = this.tokenizer.getNextToken();
        }
        return this.symbols;
    }

    private appendPublicMembersFromFile(path: string) {
        try {
            let fileData = fs.readFileSync(path, 'utf8');
            this.filesRead.push(path);
            const publicSymbols = new CtrlPublicSymbols(fileData, this.innersFilesRead - 1);
            const libSymbols = publicSymbols.getPublicMembers(this.filesRead);
            for (let i = 0; i < libSymbols.length; i++) {
                this.symbols.push(libSymbols[i]);

            }
        } catch (error) {
            console.log(path);
        }
    }

    private addClass(token: Token) {
        let classNameToken = this.tokenizer.getNextToken();
        if (classNameToken) {
            let docSymbol = new CtrlDocumentSymbol(classNameToken.symbol, 'class', vscode.SymbolKind.Class, token.range, token.range);
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

    private addMembers(classNameToken: Token) {
        let countScope = 1;
        let member = this.tokenizer.getNextToken();
        while (member != null) {
            if (member.symbol == 'public') {
                let typeMemberToken = this.getVarType();
                if (typeMemberToken) {
                    let memberName = null;
                    if (classNameToken.symbol == typeMemberToken.symbol) { //constructor
                        memberName = typeMemberToken;
                        const nextToken = this.tokenizer.getNextToken();
                        if (nextToken?.symbol == '(') {
                            let symbolMember = new CtrlDocumentSymbol(memberName.symbol, member.symbol, vscode.SymbolKind.Constructor, memberName.range, memberName.range);
                            this.nodes[this.nodes.length - 1].push(symbolMember);
                            const rangeEnd = this.getRangeContext();
                            if (rangeEnd) {
                                symbolMember.range = new vscode.Range(memberName.range.start, rangeEnd);
                            }
                        }
                    }
                    else {
                        memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                let symbolMember = new CtrlDocumentSymbol(memberName.symbol, typeMemberToken.symbol, vscode.SymbolKind.Method, memberName.range, memberName.range);
                                this.nodes[this.nodes.length - 1].push(symbolMember);
                                const rangeEnd = this.getRangeContext();
                                if (rangeEnd) {
                                    symbolMember.range = new vscode.Range(memberName.range.start, rangeEnd);
                                }
                            }
                            else {
                                if (typeMemberToken.isConst) {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, typeMemberToken.symbol, vscode.SymbolKind.Constant, memberName.range, memberName.range);
                                    this.nodes[this.nodes.length - 1].push(symbolMember);
                                }
                                else {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, typeMemberToken.symbol, vscode.SymbolKind.Field, memberName.range, memberName.range);
                                    this.nodes[this.nodes.length - 1].push(symbolMember);
                                }
                            }
                        }
                    }
                }
            }
            else if (member.symbol == '{') {
                countScope++;
            }
            else if (member.symbol == '}') {
                countScope--;
                if (countScope == 0) {
                    return;
                }
            }
            member = this.tokenizer.getNextToken();
        }
    }





}
