import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlTokenizer, Token, TokensInLine } from './CtrlTokenizer';
import { GetProjectsInConfigFile } from './CtrlComands';
import { varTypes } from './CtrlVarTypes';
import { DocumentSymbol } from 'vscode';

export enum SymbolModifiers {
    Const = 1,
    Vector = 2,
    Shared_ptr = 3,
    Static = 4,
    Public = 5,
    Private = 6,
    Global = 7
}

export class CtrlDocumentSymbol extends DocumentSymbol {
    modifiers: readonly SymbolModifiers[] = [];
    filePath?: string;
    parametersTypes: string[] = [];
    rangeType?: vscode.Range;
    children: CtrlDocumentSymbol[];
}

class TokenProperty {
    token: Token;
    modifiers: SymbolModifiers[] = [];
    constructor(token: Token, modifiers: SymbolModifiers[]) {
        this.token = token;
        this.modifiers = modifiers;
    }
}

export function CtrlGetAllmembers() {
    try {
        const doc = vscode.window.activeTextEditor?.document;
        if (doc) {
            const symbols = new CtrlAllSymbols(doc, 0);
            const members: DocumentSymbol[] = symbols.getAllMembers();
            console.log(members);
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
                else {
                    docSymbol = this.addPublicFunctionOrVar(token);
                }
                if (docSymbol != undefined) {
                    this.symbols.push(docSymbol);
                }
            }
            token = this.tokenizer.getNextToken();
        }
        return this.symbols;
    }

    private addPublicFunctionOrVar(token: Token) {
        const varType = this.getTypeVariableAndModidfiers(token);
        if (varType) {
            const memberName = this.tokenizer.getNextToken();
            if (memberName) {
                if (this.tokenizer.getNextToken()?.symbol == '(') {
                    const range = this.createRange(token);
                    const symbol =  new CtrlDocumentSymbol(memberName.symbol, 'enum', vscode.SymbolKind.Function, memberName.range, memberName.range);
                    try {
                        symbol.selectionRange = range;
                    } catch (error) {
                        debugger;
                    }
                    return symbol;
                }
                else {
                    let nextToken = this.tokenizer.getNextToken();
                    while (nextToken && nextToken.symbol != ';') {
                        nextToken = this.tokenizer.getNextToken();
                    }
                    if(nextToken == undefined){
                        nextToken = memberName;
                    }
                    return new CtrlDocumentSymbol(memberName.symbol, 'enum', vscode.SymbolKind.Variable, memberName.range, new vscode.Range(memberName.range.start, memberName.range.end));
                }
            }

        }
        return undefined;

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
            console.log('CtrlSymbols appendUserVarTypesFromFile ' + path);
        }
    }

    protected addEnum() {
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken) {
            let docSymbol = new CtrlDocumentSymbol(nextToken.symbol, 'enum', vscode.SymbolKind.Enum, nextToken.range, nextToken.range);
            this.tokenizer.getNextToken();
            this.nodes[this.nodes.length - 1].push(docSymbol);
            this.nodes.push(docSymbol.children);
            this.userVarTypes.push(nextToken.symbol);
            this.addEnumMembers();
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                docSymbol.selectionRange = new vscode.Range(docSymbol.range.start, nextToken.range.end);
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
            else if (token.symbol == '=') {
                token = this.tokenizer.getNextToken();
                continue;
            }
            else if (token.symbol.startsWith('/')) {
                token = this.tokenizer.getNextToken();
                continue;
            }
            else if (token.symbol.charCodeAt(0) < 58 && token.symbol.charCodeAt(0) > 47) {
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

    protected getSymbolKind(token: Token) {
        if (token.symbol == 'string') {
            return vscode.SymbolKind.String;
        }
        else if (token.symbol == 'bool') {
            return vscode.SymbolKind.Boolean;
        }
        else if (token.symbol == 'vector' || token.symbol.startsWith('dyn_')) {
            return vscode.SymbolKind.Array;
        }
        else if (token.symbol == 'int' || token.symbol == 'float' || token.symbol == 'uint' || token.symbol == 'double') {
            return vscode.SymbolKind.Number;
        }
        return vscode.SymbolKind.Variable;
    }

    protected getTypeVariableAndModidfiers(token: Token | null) {
        if (token?.symbol.startsWith('/')) return null;
        if (token == null) return null;
        let modifiers: SymbolModifiers[] = [];

        const prevToken = this.tokenizer.getPrevToken();
        if (prevToken?.symbol == 'new') {
            return null;
        }
        let nextToken: Token | null = token;
        if (nextToken.symbol == 'global') {
            nextToken = this.tokenizer.getNextToken();
            modifiers.push(SymbolModifiers.Global);
            if (!nextToken) return null;
        }
        if (nextToken.symbol == 'static') {
            nextToken = this.tokenizer.getNextToken();
            modifiers.push(SymbolModifiers.Static);
            if (!nextToken) return null;
        }
        if (nextToken.symbol == 'const') {
            nextToken = this.tokenizer.getNextToken();
            modifiers.push(SymbolModifiers.Const);
            if (!nextToken) return null;
        }
        if (nextToken.symbol == 'shared_ptr') {
            modifiers.push(SymbolModifiers.Shared_ptr);
            const typeInScope = this.getTypeInScope();
            if (typeInScope) {
                return new TokenProperty(typeInScope, modifiers);
            }
        }
        else if (nextToken.symbol == 'vector') {
            modifiers.push(SymbolModifiers.Vector);
            const typeInScope = this.getTypeInScope();
            if (typeInScope) {
                return new TokenProperty(typeInScope, modifiers);
            }
        }
        else if (varTypes.indexOf(nextToken.symbol) > -1 || this.userVarTypes.indexOf(nextToken.symbol) > -1) {
            const nextNextToken = this.tokenizer.getNextToken();
            if (nextNextToken?.symbol == ')' || nextNextToken?.symbol == '::') { //явное преобрахованиев в тип, например(bool) или вызов статичного метода
                this.tokenizer.backToken();
                return null;
            }
            this.tokenizer.backToken();
            return new TokenProperty(nextToken, modifiers);
        }
        return null;
    }

    private getTypeInScope() {
        let nextToken = this.tokenizer.getNextToken();
        while (nextToken &&
            (nextToken?.symbol == '<'
                || nextToken?.symbol == 'shared_ptr'
                || nextToken?.symbol == 'vector')) {
            nextToken = this.tokenizer.getNextToken();
        }
        this.tokenizer.getNextToken();
        while (nextToken && nextToken?.symbol == '>') {
            this.tokenizer.getNextToken();
        }
        return nextToken;
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
            console.log('CtrlSymbols getUserVarTypesFromFile ' + path);
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
                else if (token.symbol == 'class' || token.symbol == 'struct') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        let docSymbol = new CtrlDocumentSymbol(nextToken.symbol, 'class', vscode.SymbolKind.Class, range, token.range);
                        this.symbols.push(docSymbol);
                    }
                }
                else if (token.symbol == 'enum') {
                    let nextToken = this.tokenizer.getNextToken();
                    if (nextToken) {
                        const range = this.createRange(token)
                        let docSymbol = new CtrlDocumentSymbol(nextToken.symbol, 'enum', vscode.SymbolKind.Enum, range, token.range);
                        this.symbols.push(docSymbol);
                    }
                }
                else {
                    const varType = this.getTypeVariableAndModidfiers(token);
                    if (varType) {
                        let memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                this.getRangeContext();
                            }
                            else {
                                if (varType.modifiers.indexOf(SymbolModifiers.Const) >= 0) {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, token.symbol, vscode.SymbolKind.Constant, memberName.range, memberName.range);
                                    symbolMember.modifiers = varType.modifiers;
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
            console.log('CtrlConstantsSymbols appendNewVarsFromFile ' + path);
        }
    }
}

export class CtrlAllSymbols extends CtrlSymbols {
    public getAllMembers() {
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            if (token) {
                if (token.symbol.startsWith('//')) {
                    token = this.tokenizer.getNextToken();
                    continue;
                }
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
                    this.checkFunctionOrVar(token);
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
            this.userVarTypes.push(classNameToken.symbol);
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
            this.userVarTypes.push(classNameToken.symbol);
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

    private checkFunctionOrVar(token: Token) {
        const varType = this.getTypeVariableAndModidfiers(token);
        if (varType) {
            this.addFunctionOrVar(varType);
        }
        else if (token.symbol == 'main') {
            const tokenVarType = new Token(token.range, 'void');
            this.tokenizer.backToken();
            this.addFunctionOrVar(new TokenProperty(tokenVarType, []));
        }
    }

    private addFunctionOrVar(varType: TokenProperty) {
        const memberName = this.tokenizer.getNextToken();
        if (memberName) {
            if (this.tokenizer.getNextToken()?.symbol == '(') {
                let symbolMember = new CtrlDocumentSymbol(memberName.symbol, varType.token.symbol, vscode.SymbolKind.Function, memberName.range, memberName.range);
                this.nodes[this.nodes.length - 1].push(symbolMember);
                const rangeEnd = this.checkFunction();
                if (rangeEnd) {
                    symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                }
            }
            else {
                this.addVaribles(memberName, varType);
            }
        }
    }

    private addMembers(classNameToken: Token) {
        let member = this.tokenizer.getNextToken();
        while (member != null) {
            if (member.symbol == 'public' || member.symbol == 'private' || member.symbol == 'protected') {
                let typeMemberToken = this.getTypeVariableAndModidfiers(this.tokenizer.getNextToken());
                if (typeMemberToken) {
                    let memberName = null;
                    if (classNameToken.symbol == typeMemberToken.token.symbol) { //constructor
                        memberName = typeMemberToken;
                        const nextToken = this.tokenizer.getNextToken();
                        if (nextToken?.symbol == '(') {
                            let symbolMember = new CtrlDocumentSymbol(memberName.token.symbol, member.symbol, vscode.SymbolKind.Constructor, memberName.token.range, memberName.token.range);
                            this.nodes[this.nodes.length - 1].push(symbolMember);
                            const rangeEnd = this.checkFunction();
                            if (rangeEnd) {
                                symbolMember.selectionRange = new vscode.Range(memberName.token.range.start, rangeEnd);
                            }
                        }
                        else {
                            this.tokenizer.backToken();
                            memberName = this.tokenizer.getNextToken();
                            if (memberName) {
                                if (this.tokenizer.getNextToken()?.symbol == '(') {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, typeMemberToken.token.symbol, vscode.SymbolKind.Method, memberName.range, memberName.range);
                                    symbolMember.rangeType = typeMemberToken.token.range;
                                    this.nodes[this.nodes.length - 1].push(symbolMember);
                                    const rangeEnd = this.checkFunction();
                                    if (rangeEnd) {
                                        symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                                    }

                                }
                                else {
                                    this.tokenizer.backToken();
                                    this.addVaribles(memberName, typeMemberToken);
                                }
                            }
                        }
                    }
                    else {
                        memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                let symbolMember = new CtrlDocumentSymbol(memberName.symbol, typeMemberToken.token.symbol, vscode.SymbolKind.Method, memberName.range, memberName.range);
                                symbolMember.rangeType = typeMemberToken.token.range;
                                this.nodes[this.nodes.length - 1].push(symbolMember);
                                const rangeEnd = this.checkFunction();
                                if (rangeEnd) {
                                    symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                                }

                            }
                            else {
                                this.tokenizer.backToken();
                                this.addVaribles(memberName, typeMemberToken);
                            }
                        }
                    }
                }
            }
            else if ('~' + classNameToken.symbol == member.symbol) { // desctrucor
                const nextToken = this.tokenizer.getNextToken();
                if (nextToken?.symbol == '(') {
                    let symbolMember = new CtrlDocumentSymbol(member.symbol, member.symbol, vscode.SymbolKind.Constructor, member.range, member.range);
                    this.nodes[this.nodes.length - 1].push(symbolMember);
                    const rangeEnd = this.checkFunction();
                    if (rangeEnd) {
                        symbolMember.selectionRange = new vscode.Range(member.range.start, rangeEnd);
                    }
                }
            }
            else if (member.symbol == '}') {
                return;
            }
            else if (member.symbol != ';' && !member.symbol.startsWith('/')) { // not write private
                const varType = this.getTypeVariableAndModidfiers(member);
                if (varType) {
                    this.checkMember(varType);
                }
            }
            member = this.tokenizer.getNextToken();
        }
    }

    private checkMember(varType: TokenProperty) {
        const member = this.tokenizer.getNextToken();
        if (member?.symbol == '(') {
            let symbolMember = new CtrlDocumentSymbol(member.symbol, varType.token.symbol, vscode.SymbolKind.Method, member.range, member.range);
            this.nodes[this.nodes.length - 1].push(symbolMember);
            const rangeEnd = this.checkFunction();
            if (rangeEnd) {
                symbolMember.selectionRange = new vscode.Range(member.range.start, rangeEnd);
            }

        }
        else if (member) {
            this.tokenizer.backToken();
            this.addVaribles(member, varType);
        }
    }

    private checkFunction() {
        let token = this.tokenizer.getNextToken();
        let countScopes = 1;
        this.nodes.push(this.nodes[this.nodes.length - 1][this.nodes[this.nodes.length - 1].length - 1].children);
        while (token && countScopes != 0) {
            if (token?.symbol == ')') {
                countScopes--;
            }
            else if (token?.symbol == '(') {
                countScopes++;
            }
            else if (token) {
                const varType = this.getTypeVariableAndModidfiers(token);
                if (varType) {
                    token = this.tokenizer.getNextToken();
                    if (token) {
                        this.checkParameters(token, varType);
                    }
                }
            }
            token = this.tokenizer.getNextToken();
            if (token?.symbol == 'synchronized') {
                token = this.tokenizer.getNextToken(4);
            }
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

    private addVaribles(memberName: Token, typeProperty: TokenProperty) {
        const symbolKind = this.getSymbolKind(typeProperty.token);
        const newSymbol = this.addVariable(memberName, typeProperty, symbolKind);
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken?.symbol == ',') {
            while (nextToken && nextToken?.symbol == ',') {
                nextToken = this.tokenizer.getNextToken();
                if (nextToken) {
                    this.addVariable(nextToken, typeProperty, symbolKind);
                }
                nextToken = this.tokenizer.getNextToken();
            }
        }
        else {
            this.tokenizer.backToken();
            this.tokenizer.backToken();
            nextToken = this.tokenizer.getNextToken();
        }
        while (nextToken && nextToken?.symbol != ';') {
            nextToken = this.tokenizer.getNextToken();
        }
        if (nextToken) {
            newSymbol.selectionRange = new vscode.Range(memberName.range.start, nextToken.range.end);
        }
    }

    private addVariable(variable: Token, typeProperty: TokenProperty, symbolKind: vscode.SymbolKind = vscode.SymbolKind.Variable) {
        let newSymbol = new CtrlDocumentSymbol(variable.symbol, typeProperty.token.symbol, symbolKind, variable.range, variable.range);
        newSymbol.rangeType = typeProperty.token.range;
        newSymbol.modifiers = typeProperty.modifiers;
        this.nodes[this.nodes.length - 1].push(newSymbol);
        return newSymbol;
    }

    private checkParameters(token: Token, varType: TokenProperty) {
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
        while (token && countScopes != 0) {
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
                const varType = this.getTypeVariableAndModidfiers(token);
                if (varType) {
                    token = this.tokenizer.getNextToken();
                    if (token) {
                        const kind = varType.modifiers.indexOf(SymbolModifiers.Const) >= 0 ? vscode.SymbolKind.Constant : vscode.SymbolKind.Variable;
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
        while (token && countScopes != 0) {
            if (token?.symbol == ')') {
                countScopes--;
            }
            else if (token?.symbol == '(') {
                countScopes++;
            }
            else if (token) {
                const varType = this.getTypeVariableAndModidfiers(token);
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
                    const varType = this.getTypeVariableAndModidfiers(token);
                    if (varType) {
                        let memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                let symbolMember = new CtrlDocumentSymbol(memberName.symbol, varType.token.symbol, vscode.SymbolKind.Function, memberName.range, memberName.range);
                                this.nodes[this.nodes.length - 1].push(symbolMember);
                                const rangeEnd = this.getRangeContext();
                                if (rangeEnd) {
                                    symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                                }
                            }
                            else {
                                if (varType.modifiers.indexOf(SymbolModifiers.Const) >= 0) {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, varType.token.symbol, vscode.SymbolKind.Constant, memberName.range, memberName.range);
                                    this.nodes[this.nodes.length - 1].push(symbolMember);
                                }
                                else {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, varType.token.symbol, vscode.SymbolKind.Variable, memberName.range, memberName.range);
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
                libSymbols[i].filePath = path;
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
                docSymbol.selectionRange = new vscode.Range(docSymbol.range.start, nextToken.range.end);
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
                const varType = this.getTypeVariableAndModidfiers(member);
                if (varType) {
                    let memberName = null;
                    if (classNameToken.symbol == varType.token.symbol) { //constructor
                        memberName = varType.token;
                        const nextToken = this.tokenizer.getNextToken();
                        if (nextToken?.symbol == '(') {
                            let symbolMember = new CtrlDocumentSymbol(memberName.symbol, varType.token.symbol, vscode.SymbolKind.Constructor, memberName.range, memberName.range);
                            this.nodes[this.nodes.length - 1].push(symbolMember);
                            const rangeEnd = this.getRangeContext();
                            if (rangeEnd) {
                                symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                            }
                        }
                    }
                    else {
                        memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                let symbolMember = new CtrlDocumentSymbol(memberName.symbol, varType.token.symbol, vscode.SymbolKind.Method, memberName.range, memberName.range);
                                this.nodes[this.nodes.length - 1].push(symbolMember);
                                const rangeEnd = this.getRangeContext();
                                if (rangeEnd) {
                                    symbolMember.selectionRange = new vscode.Range(memberName.range.start, rangeEnd);
                                }
                            }
                            else {
                                if (varType.modifiers.indexOf(SymbolModifiers.Const) >= 0) {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, varType.token.symbol, vscode.SymbolKind.Constant, memberName.range, memberName.range);
                                    this.nodes[this.nodes.length - 1].push(symbolMember);
                                }
                                else {
                                    let symbolMember = new CtrlDocumentSymbol(memberName.symbol, varType.token.symbol, vscode.SymbolKind.Field, memberName.range, memberName.range);
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
