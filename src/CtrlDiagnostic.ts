import * as fs from 'fs';
import { CtrlTokenizer, Token, TokensInLine } from './CtrlTokenizer';
import * as vscode from 'vscode';
import { GetProjectsInConfigFile } from './ctrlComands';
import exp = require('constants');
import { CtrlSymbols } from './CctrlSymbols';


const varTypes: string[] = [
    'blob'
    , 'bool'
    , 'void'
    , 'shape'
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
    , 'shared_ptr'
    , 'vector'
    , 'void'
];

const reservedWords: string[] = [
    'class'
    , 'public'
    , 'private'
    , 'static'
    , 'const'
]

export async function startDiagnosticFile(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
    const checkSyntax = vscode.workspace.getConfiguration("FixLineTool.Syntax").get("CheckSyntax");
    if (!checkSyntax) return;
    const diagnostic = new CtrlDiagnostic();
    diagnostic.startDiagnosticFile(document, collection);
}

class CtrlDiagnostic {
    private symbols: vscode.DocumentSymbol[] = [];
    private nodes: Array<vscode.DocumentSymbol[]> = [this.symbols];
    private userVarTypes: string[] = [];
    private diagnostics: vscode.Diagnostic[] = [];
    private tokenizer: CtrlTokenizer;
    public async startDiagnosticFile(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
        if (document && document.languageId == "ctrlpp") {
            this.userVarTypes = [];
            this.updateCtrlDiagnostics(document);
        } else {
            collection.clear();
        }
        collection.set(document.uri, this.diagnostics);
    }
    private updateCtrlDiagnostics(document: vscode.TextDocument | string) {
        this.tokenizer = new CtrlTokenizer(document);
        let token = this.tokenizer.getNextToken();
        while (token != null) {
            if (token.symbol == '#uses') {
                this.checkUsesExistingPath(token);
            }
            else if (token.symbol == 'class') {
                this.checkClass(token);
                this.checkUsingPrivateMembers(token);
            }
            token = this.tokenizer.getNextToken();
        }
    }

    private checkUsesExistingPath(token: Token) {
        if (this.tokenizer == undefined) return;
        let tokenLibrary = this.tokenizer.getNextToken();
        if (tokenLibrary == null) return;
        const findLibrary = tokenLibrary.symbol.slice(1, tokenLibrary.symbol.length - 1);
        if (!(tokenLibrary.symbol.startsWith('"') && tokenLibrary.symbol.endsWith('"'))) {
            this.pushErrorDiagnostic('# uses not link', token.range);
        }
        else {
            let paths = GetProjectsInConfigFile();
            let pathCorrect = false;
            let extLib = (process.platform === "win32") ? '.dll' : '.so';
            for (let j = paths.length - 1; j >= 0; j--) {
                const path1 = paths[j] + '/scripts/libs/' + findLibrary + '.ctl';
                const path2 = paths[j] + '/scripts/libs/' + findLibrary;
                const path3 = paths[j] + '/bin/' + findLibrary + extLib;

                if (fs.existsSync(path1)) {
                    this.appendUserVarTypesFromFile(path1);
                    pathCorrect = true;
                    break;
                }
                else if (fs.existsSync(path2)) {
                    this.appendUserVarTypesFromFile(path2);
                    pathCorrect = true;
                    break;
                }
                else if (fs.existsSync(path3)) {
                    pathCorrect = true;
                    break;
                }
            }
            if (!pathCorrect) {
                this.pushErrorDiagnostic('cannot find file /scripts/libs/' + findLibrary + '"', tokenLibrary.range);

            }
        }
    }

    private checkClass(token: Token) {
        this.checkNewVarClass(token);
        const nextToken = this.tokenizer.getNextToken();
        if (!(nextToken?.symbol == ';')) {
            this.tokenizer.backToken();
            this.pushErrorDiagnostic('Class inner body error', token.range);
        }
    }

    private checkNewVarClass(token: Token) {
        let classNameToken = this.tokenizer.getNextToken();
        if (classNameToken) {
            if (this.checkVariable(classNameToken)) {
                let doc = this.nodes[this.nodes.length - 1][this.nodes[this.nodes.length - 1].length - 1].children;
                this.nodes.push(doc);
                this.userVarTypes.push(classNameToken.symbol);
            }
            if (this.tokenizer.getNextToken()?.symbol == '{') {
                try {
                    this.checkMembers(classNameToken);                    
                } catch (error) {
                    console.log(error);
                }
            }
            this.popNodesMembers();
        }
        else {
            this.pushErrorDiagnostic('Class is not declared', token.range);
            this.tokenizer.backToken();
        }
    }

    private checkMembers(classNameToken: Token) {
        let member = this.tokenizer.getNextToken();
        while (member != null) {
            if (member.symbol == 'public' || member.symbol == 'private' || member.symbol == 'protected') {
                const typeMemberToken = this.getVarType();
                if (typeMemberToken) {
                    let memberName = null;
                    if (classNameToken.symbol == typeMemberToken.symbol) { //constructor
                        memberName = typeMemberToken;
                        if (this.tokenizer.getNextToken()?.symbol == '(') {
                            this.nodes[this.nodes.length - 1].push(new vscode.DocumentSymbol(memberName.symbol, 'public', vscode.SymbolKind.Variable, memberName.range, memberName.range));
                            this.checkFunction(memberName);
                        }
                        else {
                            this.pushErrorDiagnostic('Constructor is not declared correctly', member.range);
                        }
                    }
                    else {
                        memberName = this.tokenizer.getNextToken();
                        if (memberName) {
                            if (this.tokenizer.getNextToken()?.symbol == '(') {
                                this.checkVaribles(memberName, member.symbol);
                                this.checkFunction(memberName);
                            }
                            else {
                                this.tokenizer.backToken();
                                this.checkVaribles(memberName, member.symbol);
                            }

                        }
                        else {
                            this.pushErrorDiagnostic('Variable is not declared', member.range);
                        }
                    }
                }
                else {
                    this.pushErrorDiagnostic('Member is not declared', member.range);
                }
            }
            else if (this.isDeclarVariable(member)) {//in class default private, in strict public

            }
            else if (member.symbol == '}') {
                return;
            }
            member = this.tokenizer.getNextToken();
        }
    }

    private checkVaribles(memberName: Token, detial: string = 'var') {
        this.checkVariable(memberName, detial);
        let nextToken = this.tokenizer.getNextToken();
        while (nextToken?.symbol == ',') {
            nextToken = this.tokenizer.getNextToken();
            if (nextToken) {
                this.checkVariable(nextToken, detial);
            }
            nextToken = this.tokenizer.getNextToken();
        }
        this.tokenizer.backToken();
    }

    private getVarType() {
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken) {
            if (nextToken.symbol == 'static') {
                nextToken = this.tokenizer.getNextToken();
                if (!nextToken) return;
            }
            if (nextToken.symbol == 'const') {
                nextToken = this.tokenizer.getNextToken();
                if (!nextToken) return;
            }
            if (this.isDeclarVariable(nextToken)) {
                return nextToken;
            }
            else {
                this.pushErrorDiagnostic('Unknow type', nextToken.range);
            }
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
                if (this.isDeclarVariable(token)) {
                    token = this.tokenizer.getNextToken();
                    if (token) {
                        this.checkParameters(token);
                    }
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
            this.pushErrorDiagnostic('Error  scope function', memberName.range);
        }
    }

    private isDeclarVariable(token: Token) {
        this.tokenizer.backToken();
        this.tokenizer.backToken();
        const prevToken = this.tokenizer.getNextToken();
        this.tokenizer.getNextToken();
        if (prevToken?.symbol == 'new') {
            return false;
        }
        if (token.symbol == 'shared_ptr') {
            this.checkSharedPtr(token);
            return true;
        }
        else if (token.symbol == 'vector') {
            this.checkSharedPtr(token);
            return true;
        }
        else if (varTypes.indexOf(token.symbol) > -1 || this.userVarTypes.indexOf(token.symbol) > -1) {
            const nextToken = this.tokenizer.getNextToken();
            this.tokenizer.backToken();
            if (nextToken?.symbol == ')') {
                return false;
            }
            return true;
        }
        return false;
    }

    private checkParameters(token: Token) {
        if (token) {
            if (token.symbol == '&') {
                let nextToken = this.tokenizer.getNextToken();
                if (nextToken) {
                    this.checkVariable(nextToken);
                }
            }
            else {
                this.checkVariable(token);
            }
        }
    }

    private checkBodyFunction() {
        let countScopes = 1;
        let token = this.tokenizer.getNextToken();
        while (countScopes != 0) {
            if (token?.symbol == '{') {
                countScopes++;
                let docSymbol = new vscode.DocumentSymbol(token.symbol, '{', vscode.SymbolKind.Operator, token.range, token.range);
                this.nodes[this.nodes.length - 1].push(docSymbol);
                this.nodes.push(docSymbol.children);
            }
            else if (token?.symbol == '}') {
                countScopes--;
                this.popNodesFunction();

            }
            else if (token?.symbol == 'for') {
                this.checkForExpression(token);
            }
            else if (token) {
                if (this.isDeclarVariable(token)) {
                    token = this.tokenizer.getNextToken();
                    if (token) {
                        this.checkVaribles(token);
                    }
                }
                else {
                    this.checkUsingVars(token);
                }
            }
            token = this.tokenizer.getNextToken();
        }
        this.tokenizer.backToken();
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
                if (this.isDeclarVariable(token)) {
                    token = this.tokenizer.getNextToken();
                    if (token) {
                        this.checkParameters(token);
                    }
                }
                else {
                    this.checkUsingVars(token);
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

    private appendUserVarTypesFromFile(path: string) {
        let fileData = fs.readFileSync(path, 'utf8');
        const symbols = new CtrlSymbols(fileData);
        symbols.getNewTypesData().forEach(symbol => {
            if (symbol.kind == vscode.SymbolKind.Class
                || symbol.kind == vscode.SymbolKind.Struct
                || symbol.kind == vscode.SymbolKind.Enum
            ) {
                this.userVarTypes.push(symbol.name);
            }
        });
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
                    this.pushErrorDiagnostic('Can\'t find type ' + nextToken.symbol, nextToken.range);
                    return;
                }
            }
        }
        this.pushErrorDiagnostic('Error declare shared_ptr or vector', token.range);
    }

    private checkVariable(variable: Token, detial: string = 'var') {
        let correctName = this.isVarNameCorrect(variable.symbol);
        if (correctName) {
            for (let i = 0; i < this.nodes[this.nodes.length - 1].length; i++) {
                if (variable.symbol == this.nodes[this.nodes.length - 1][i].name) {
                    this.pushErrorDiagnostic('Duplicate naming variable', variable.range);
                    return false;
                }
            }
            this.nodes[this.nodes.length - 1].push(new vscode.DocumentSymbol(variable.symbol, detial, vscode.SymbolKind.Variable, variable.range, variable.range));
            return true;
        }
        this.pushErrorDiagnostic('Error naming variable', variable.range);
        return false;
    }

    private isVarNameCorrect(varName: string) {
        if (varTypes.indexOf(varName) > -1 || this.userVarTypes.indexOf(varName) > -1 || reservedWords.indexOf(varName) > -1) {
            return false;
        }
        const matchVarName = varName.match(/[A-Za-z]+[A-Za-z\d-_]*/);
        return !(matchVarName == null || matchVarName?.[0] != matchVarName?.input);
    }

    private pushErrorDiagnostic(message: string, range: vscode.Range, severity = vscode.DiagnosticSeverity.Error, code = '') {
        this.diagnostics.push({
            code: code,
            message: message,
            range: range,
            severity: severity,
            source: 'fixline tool'
        });
    }

    private popNodesFunction() {
        const docSymbols = this.nodes[this.nodes.length - 1];
        docSymbols.forEach(symbol => {
            if (symbol.name != 'for' && symbol.name != '{' && symbol.detail != 'readed') {
                this.pushErrorDiagnostic('varible not use', symbol.range, vscode.DiagnosticSeverity.Warning);
            }
        });
        this.nodes.pop();
    }

    private popNodesMembers() {
        this.nodes.pop();
    }

    private checkUsingVars(token: Token) {
        if (token.symbol.charCodeAt(0) < 65) return; //  заглушка от множесива токенов (символ A начинаются с 65)
        for (let j = this.nodes.length - 1; j > 0; j--) {
            for (let i = 0; i < this.nodes[j].length; i++) {
                if (this.nodes[j][i].detail == 'public' || this.nodes[j][i].detail == 'private') { //если поднялись до методов
                    return;
                }
                if (this.nodes[j][i].name == token.symbol) {
                    this.nodes[j][i].detail = 'readed';
                    return;
                }
            }
        }
    }

    private checkUsingPrivateMembers(tokenStart: Token) {
        this.tokenizer.backToken();
        const endToken = this.tokenizer.getNextToken();
        if (endToken) {
            const text = this.tokenizer.textSplitter.getTextWithoutComment(new vscode.Range(tokenStart.range.start, endToken.range.end));
            for (let i = 0; i < this.symbols[this.symbols.length - 1].children.length; i++) {
                if (this.symbols[this.symbols.length - 1].children[i].detail == 'private') {
                    let regExp = new RegExp('(?:this.)?' + this.symbols[this.symbols.length - 1].children[i].name, 'gm');
                    const matches = text.match(regExp);
                    if (matches == null || matches.length < 2) {
                        this.pushErrorDiagnostic('private member not use', this.symbols[this.symbols.length - 1].children[i].range, vscode.DiagnosticSeverity.Warning);
                    }
                }
            }
        }

    }
}