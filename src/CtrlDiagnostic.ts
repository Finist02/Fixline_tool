import * as vscode from 'vscode';
import * as fs from 'fs';
import { CtrlTokenizer, Token } from './CtrlTokenizer';
import { GetProjectsInConfigFile } from './CtrlComands';
import { CtrlSymbols } from './CtrlSymbols';
import { reservedWords, varTypes } from './CtrlVarTypes';

export const COMMAND_EXCLUDE_ERROR = 'code-actions-ctl.commandExcludeError';

const Default_code = 'default';
const AddNew_code = 'add new';
const VarNotUse_code = 'variable not use';
interface excludeType {
    filePath: string;
    errorProps: ErrorProps[];
}
interface ErrorProps {
    message: string;
    range: Range[];

}
interface Range {
    line: number,
    character: number
}
export let ruleExcludeErrors: excludeType[];

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
    private checkDataTypes = true;
    private documentPath = '';
    public async startDiagnosticFile(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
        if (document && document.languageId == "ctrlpp") {
            this.documentPath = document.uri.fsPath;
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
            else if (token.symbol == 'struct') {
                this.checkClass(token, 'public');
                this.checkUsingPrivateMembers(token);
            }
            else if (token.symbol == 'enum') {
                this.checkEnum(token);
            }
            else {
                this.checkFunctionOrVar(token);
            }
            token = this.tokenizer.getNextToken();
        }
    }

    private checkFunctionOrVar(token: Token) {
        if (token.symbol.startsWith('/')) return;
        if (token.symbol == 'main') {
            this.tokenizer.getNextToken();
            this.nodes[this.nodes.length - 1].push(new vscode.DocumentSymbol(token.symbol, 'void', vscode.SymbolKind.Variable, token.range, token.range));
            this.checkFunction(token);
        }
        else {
            this.tokenizer.backToken();
            let typeMemberToken = this.getVarType();
            if (typeMemberToken) {
                let varName = this.tokenizer.getNextToken();
                if (varName) {
                    if (this.tokenizer.getNextToken()?.symbol == '(') {
                        this.checkVaribles(varName, typeMemberToken.symbol);
                        this.nodes[this.nodes.length - 1].push(new vscode.DocumentSymbol(token.symbol, 'void', vscode.SymbolKind.Variable, token.range, token.range));
                        this.checkFunction(varName);
                    }
                    else {
                        this.tokenizer.backToken();
                        this.checkVaribles(varName, typeMemberToken.symbol);
                        varName = this.tokenizer.getNextToken();
                        while (varName?.symbol != ';') {
                            varName = this.tokenizer.getNextToken();
                        }
                    }
                }
            }
            else {
                this.tokenizer.getNextToken();
            }
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
                const path4 = paths[j] + '/scripts/libs/' + findLibrary + '.ctc';

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
                else if (fs.existsSync(path4)) {
                    this.checkDataTypes = false;
                    pathCorrect = true;
                    break;
                }
            }
            if (!pathCorrect) {
                this.pushErrorDiagnostic('cannot find file /scripts/libs/' + findLibrary + '"', tokenLibrary.range);

            }
        }
    }

    private checkClass(token: Token, defaultMembersType: string = 'private') {
        this.checkNewVarClass(token, defaultMembersType);
        const nextToken = this.tokenizer.getNextToken();
        if (!(nextToken?.symbol == ';')) {
            this.tokenizer.backToken();
            this.pushErrorDiagnostic('Class inner body error not close correctly ;', token.range);
        }
    }

    private checkEnum(token: Token) {
        let enumNameToken = this.tokenizer.getNextToken();
        if (enumNameToken) {
            if (this.checkVariable(enumNameToken)) {
                let doc = this.nodes[this.nodes.length - 1][this.nodes[this.nodes.length - 1].length - 1].children;
                this.nodes.push(doc);
                this.userVarTypes.push(enumNameToken.symbol);
            }
            if (this.tokenizer.getNextToken()?.symbol == '{') {
                try {
                    this.checkEnumMembers();
                } catch (error) {
                    console.log('checkEnum', error);
                }
            }
            this.popNodesMembers();
            const nextToken = this.tokenizer.getNextToken();
            if (!(nextToken?.symbol == ';')) {
                this.tokenizer.backToken();
                this.pushErrorDiagnostic('Enum inner body error not close correctly ;', token.range);
            }
        }
        else {
            this.pushErrorDiagnostic('Enum is not declared', token.range);
            this.tokenizer.backToken();
        }
    }

    private checkEnumMembers() {
        let token = this.tokenizer.getNextToken();
        if (token?.symbol.startsWith('/')) {
            token = this.tokenizer.getNextToken();
        }
        while (token != null) {
            if (this.checkVariable(token)) {
                token = this.tokenizer.getNextToken();
                if (token?.symbol.startsWith('/')) {
                    token = this.tokenizer.getNextToken();
                }
                if (token) {
                    if (token.symbol == '=') {
                        let tokenNumber = this.tokenizer.getNextToken();
                        if (tokenNumber) {
                            if (tokenNumber.symbol.charCodeAt(0) < 58 && tokenNumber.symbol.charCodeAt(0) > 47) {
                                token = this.tokenizer.getNextToken();
                                if (token?.symbol.startsWith('/')) {
                                    token = this.tokenizer.getNextToken();
                                }
                                if (token?.symbol == '}') {
                                    break;
                                }
                                if (token?.symbol != ',') {
                                    this.pushErrorDiagnostic('Enum expected ,', tokenNumber.range);
                                }
                                token = this.tokenizer.getNextToken();
                                if (!token?.symbol.startsWith('/')) {
                                    this.tokenizer.backToken();
                                }
                            }
                            else {
                                this.pushErrorDiagnostic('Enum expected number', tokenNumber.range);
                            }
                        }
                    }
                    else if (token.symbol == '}') {
                        break;
                    }
                    else if (token.symbol != ',') {
                        this.pushErrorDiagnostic('Enum expected1 ,', token.range);
                        break;
                    }
                }
            }
            token = this.tokenizer.getNextToken();
            if (token?.symbol.startsWith('/')) {
                token = this.tokenizer.getNextToken();
            }
        }
    }

    private checkNewVarClass(token: Token, defaultMembersType: string = 'private') {
        let classNameToken = this.tokenizer.getNextToken();
        if (classNameToken) {
            let nextToken = this.tokenizer.getNextToken();
            if (nextToken?.symbol != ':') {  //унаследован
                this.tokenizer.backToken();
            }
            else {
                nextToken = this.tokenizer.getNextToken();
                if (nextToken) {
                    if (this.userVarTypes.indexOf(nextToken.symbol) < 0) {
                        this.pushErrorDiagnostic('Unknow parent class', nextToken.range);
                    }
                }
            }
            if (this.checkVariable(classNameToken)) {
                let doc = this.nodes[this.nodes.length - 1][this.nodes[this.nodes.length - 1].length - 1].children;
                this.nodes.push(doc);
                this.userVarTypes.push(classNameToken.symbol);
            }
            if (this.tokenizer.getNextToken()?.symbol == '{') {
                try {
                    this.checkMembers(classNameToken, defaultMembersType);
                } catch (error) {
                    console.log(error);
                }
            }
            this.popNodesMembers();
            let doc = this.nodes[this.nodes.length - 1][this.nodes[this.nodes.length - 1].length - 1];
            let endToken = this.tokenizer.getNextToken();
            if (endToken) {
                doc.selectionRange = new vscode.Range(classNameToken.range.start, endToken.range.end);
                this.tokenizer.backToken();
            }
        }
        else {
            this.pushErrorDiagnostic('Class is not declared', token.range);
            this.tokenizer.backToken();
        }
    }

    private checkMembers(classNameToken: Token, defaultMembersType: string = 'private') {
        let member = this.tokenizer.getNextToken();
        while (member != null) {
            if (member.symbol == 'public' || member.symbol == 'private' || member.symbol == 'protected') {
                let typeMemberToken = this.getVarType();
                if (typeMemberToken) {
                    let memberName = null;
                    if (classNameToken.symbol == typeMemberToken.symbol) { //type selfClass
                        memberName = typeMemberToken;
                        if (this.tokenizer.getNextToken()?.symbol == '(') { //constructor
                            this.nodes[this.nodes.length - 1].push(new vscode.DocumentSymbol(memberName.symbol, 'public', vscode.SymbolKind.Constructor, memberName.range, memberName.range));
                            this.checkFunction(memberName);
                            this.setSelectionRange(memberName);
                        }
                        else {//method selftype
                            this.tokenizer.backToken();
                            memberName = this.tokenizer.getNextToken();
                            if (memberName) {
                                if (this.tokenizer.getNextToken()?.symbol == '(') {
                                    this.checkVaribles(memberName, member.symbol);
                                    this.checkFunction(memberName);
                                }
                                else {
                                    this.tokenizer.backToken();
                                    this.checkFieldMember(memberName, member.symbol);
                                }
                                this.setSelectionRange(memberName);
                            }
                            else {
                                this.pushErrorDiagnostic('Variable is not declared', member.range);
                            }
                            // this.pushErrorDiagnostic('Constructor is not declared correctly', member.range);
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
                                this.checkFieldMember(memberName, member.symbol);
                            }
                            this.setSelectionRange(memberName);
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
                let memberName = this.tokenizer.getNextToken();
                if (memberName) {
                    if (this.tokenizer.getNextToken()?.symbol == '(') {
                        this.checkVaribles(memberName, defaultMembersType);
                        this.checkFunction(memberName);
                    }
                    else {
                        this.tokenizer.backToken();
                        this.checkFieldMember(memberName, defaultMembersType);
                    }
                    this.setSelectionRange(memberName);
                }
                else {
                    this.pushErrorDiagnostic('Variable is not declared', member.range);
                }
            }
            else if (member.symbol == '~' + classNameToken.symbol) { // desctrucor
                let memberName = this.tokenizer.getNextToken();
                if (memberName && memberName.symbol == '(') {
                    this.nodes[this.nodes.length - 1].push(new vscode.DocumentSymbol(memberName.symbol, 'public', vscode.SymbolKind.Constructor, memberName.range, memberName.range));
                    this.checkFunction(memberName);
                    this.setSelectionRange(memberName);
                }
                else {
                    this.pushErrorDiagnostic('Error declared destructor', member.range);
                }
            }
            else if (member.symbol == '}') {
                return;
            }
            member = this.tokenizer.getNextToken();
        }
    }

    private setSelectionRange(startToken: Token) {
        this.tokenizer.backToken();
        let doc = this.nodes[this.nodes.length - 1][this.nodes[this.nodes.length - 1].length - 1];
        let endToken = this.tokenizer.getNextToken();
        if (endToken) {
            doc.selectionRange = new vscode.Range(startToken.range.start, endToken.range.end);
            this.tokenizer.backToken();
        }
        this.tokenizer.getNextToken();
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

    private checkFieldMember(memberName: Token, detial: string = 'var') {
        this.checkVariable(memberName, detial);
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken?.symbol == ',') {
            while (nextToken?.symbol == ',') {
                nextToken = this.tokenizer.getNextToken();
                if (nextToken) {
                    this.checkVariable(nextToken, detial);
                }
                nextToken = this.tokenizer.getNextToken();
            }
        }
        else {
            this.tokenizer.backToken(2);
            nextToken = this.tokenizer.getNextToken();
        }
        while (nextToken?.symbol != ';') {
            nextToken = this.tokenizer.getNextToken();
        }
        this.tokenizer.backToken();
    }

    private getVarType() {
        let nextToken = this.tokenizer.getNextToken();
        if (nextToken) {
            if (nextToken.symbol == 'public') {
                nextToken = this.tokenizer.getNextToken();
                if (!nextToken) return;
            }
            if (nextToken.symbol == 'private') {
                nextToken = this.tokenizer.getNextToken();
                if (!nextToken) return;
            }
            if (nextToken.symbol == 'global') {
                nextToken = this.tokenizer.getNextToken();
                if (!nextToken) return;
            }
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
            else if (this.tokenizer.getNextToken()?.symbol == '(') {
                this.tokenizer.backToken();
                this.tokenizer.backToken();
                return nextToken;
            }
            else {
                this.pushErrorDiagnostic('Unknown type', nextToken.range);
            }
        }
        return null;
    }

    private checkFunction(memberName: Token) {
        let token = this.tokenizer.getNextToken();
        let countScopes = 1;
        this.nodes.push(this.nodes[this.nodes.length - 1][this.nodes[this.nodes.length - 1].length - 1].children);
        while (countScopes != 0 && token != null) {
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
        if (token?.symbol == ':' || token?.symbol == 'synchronized') {
            token = this.tokenizer.getNextToken();
            while (token && token.symbol != '{') {
                token = this.tokenizer.getNextToken();
                if (token) {
                    this.markUsingVars(token);
                }
            }
        }
        if (token?.symbol.startsWith('//') || token?.symbol.startsWith('/*')) {
            token = this.tokenizer.getNextToken();
        }
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
            if (nextToken?.symbol == ')' || nextToken?.symbol == '::') {
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
                    const varNameToken = this.tokenizer.getNextToken();
                    if (varNameToken) {
                        if (varNameToken.symbol == '(' && this.userVarTypes.indexOf(token.symbol) >= 0) { // QSql_Parameters(connectionString); - remind false
                            this.pushErrorDiagnostic('Forgot the keyword new?', token.range, vscode.DiagnosticSeverity.Information, AddNew_code);
                        }
                        else {
                            this.checkVaribles(varNameToken);
                        }
                    }
                }
                else {
                    this.markUsingVars(token);
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
                    this.markUsingVars(token);
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
        const innersReadFiles = vscode.workspace.getConfiguration("FixLineTool.Syntax").get("InnersReadFiles");
        let deepFileRead = 1;
        if (typeof innersReadFiles === 'number') deepFileRead = innersReadFiles;
        const symbols = new CtrlSymbols(fileData, deepFileRead);
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
        const matchVarName = varName.match(/[A-Za-z_]+[A-Za-z\d\-_]*/);
        return !(matchVarName == null || matchVarName?.[0] != matchVarName?.input);
    }

    private pushErrorDiagnostic(message: string, range: vscode.Range, severity = vscode.DiagnosticSeverity.Error, code = Default_code) {
        for (let i = 0; i < ruleExcludeErrors.length; i++) {
            if (ruleExcludeErrors[i].filePath == this.documentPath) {
                for (let j = 0; j < ruleExcludeErrors[i].errorProps.length; j++) {
                    const element = ruleExcludeErrors[i].errorProps[j];
                    if (element.message == message
                        && element.range[0].line == range.start.line && element.range[0].character == range.start.character
                        && element.range[1].line == range.end.line && element.range[1].character == range.end.character
                    ) {
                        return;
                    }
                }
            }
        }
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
        for (let i = 0; i < docSymbols.length; i++) {
            const symbol = docSymbols[i];
            if (symbol.name != 'for' && symbol.name != '{' && symbol.detail != 'readed') {
                this.pushErrorDiagnostic('variable not use', symbol.range, vscode.DiagnosticSeverity.Warning, VarNotUse_code);
            }
        }
        this.nodes.pop();
    }

    private popNodesMembers() {
        this.nodes.pop();
    }

    private markUsingVars(token: Token) {
        if (token.symbol.charCodeAt(0) < 65) return; //  заглушка от множества токенов (символ A начинаются с 65)
        if (token.symbol == "{") return;
        for (let j = this.nodes.length - 1; j > 0; j--) {
            for (let i = 0; i < this.nodes[j].length; i++) {
                if (this.nodes[j][i].detail == 'public' || this.nodes[j][i].detail == 'private') { //если поднялись до методов
                    return;
                }
                if (this.nodes[j][i].name == token.symbol) {
                    const prevToken = this.tokenizer.getPrevToken();
                    const prevPrevToken = this.tokenizer.getPrevToken(2);
                    if (!(prevPrevToken?.symbol == 'this' && prevToken?.symbol == '.')){
                        this.nodes[j][i].detail = 'readed';
                        return;
                    }
                }
            }
        }
    }

    private checkUsingPrivateMembers(tokenStart: Token) {
        this.tokenizer.backToken();
        const endToken = this.tokenizer.getNextToken();
        if (endToken) {
            let privateMembers: vscode.DocumentSymbol[] = [];
            for (let i = 0; i < this.symbols[this.symbols.length - 1].children.length; i++) {
                if (this.symbols[this.symbols.length - 1].children[i].detail == 'private') {
                    privateMembers.push(this.symbols[this.symbols.length - 1].children[i]);
                }
            }
            for (let i = 0; i < privateMembers.length; i++) {
                const memberToFind = privateMembers[i];
                let isMemberUse = false;
                for (let j = 0; j < this.symbols[this.symbols.length - 1].children.length; j++) {
                    let symbol = this.symbols[this.symbols.length - 1].children[j];
                    if (symbol.name == memberToFind.name) continue;
                    let varTokens = this.tokenizer.getTokens(symbol.selectionRange);
                    if (symbol.children.length > 0) {
                        isMemberUse = this.checkUsingMemberInFunction(symbol.children, varTokens, memberToFind.name);
                    }
                    else {
                        isMemberUse = this.checkUsingMemberInFunction([symbol], varTokens, memberToFind.name);
                    }
                    if (isMemberUse) break;
                }
                if (!isMemberUse) {
                    this.pushErrorDiagnostic('private member not use', memberToFind.range, vscode.DiagnosticSeverity.Warning);

                }
            }
        }
    }

    private checkUsingMemberInFunction(symbols: vscode.DocumentSymbol[], tokens: Token[], memberNameToFind: string, onlyThis: boolean = false) {
        let isMemberUse = false;
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            if (symbol == undefined) break;
            isMemberUse = this.checkUsingMemberInScope(tokens, symbol.range, memberNameToFind, onlyThis);
            if (isMemberUse) return true;
            if (symbol.name == memberNameToFind) {
                onlyThis = true;
            }
            if (symbol.children.length > 0) {
                isMemberUse = this.checkUsingMemberInFunction(symbol.children, tokens, memberNameToFind, onlyThis);
                if (isMemberUse) return true;
            }
        }
        isMemberUse = this.checkUsingMemberInScope(tokens, null, memberNameToFind, onlyThis);
        return isMemberUse;
    }

    private checkUsingMemberInScope(tokens: Token[], stopRange: vscode.Range | null, memberNameToFind: string, onlyThis: boolean) {
        let token = tokens.shift();
        let tokenPrev = token;
        let tokenPrevPrev = token;
        while (token) {
            if (stopRange && token.range.start.line >= stopRange.start.line) break;
            if (token.symbol == '}') return false;
            if (onlyThis) {
                if ((token.symbol == memberNameToFind && tokenPrevPrev?.symbol == 'this') || (token.symbol == '"' + memberNameToFind + '"' && tokenPrevPrev?.symbol == 'this')) {
                    return true;
                }
            }
            else if (token.symbol == memberNameToFind || token.symbol == '"' + memberNameToFind + '"') {
                return true;
            }
            tokenPrevPrev = tokenPrev;
            tokenPrev = token;
            token = tokens.shift();
        }
        if (token) tokens.splice(0, 0, token);
        return false;
    }
}

/**
 * Provides code actions corresponding to diagnostic problems.
 */
export class CtrlCodeAction implements vscode.CodeActionProvider {
    static excludesFile = '';
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
        // for each diagnostic entry that has the matching `code`, create a code action command
        let arryaDiagnostics: vscode.CodeAction[] = [];
        for (let i = 0; i < context.diagnostics.length; i++) {
            if (context.diagnostics[i].code === AddNew_code) {
                arryaDiagnostics.push(this.createCommandCodeActionAddNewKey(document, context.diagnostics[i].range));
            }
            if (context.diagnostics[i].code === VarNotUse_code) {
                arryaDiagnostics.push(this.createCommandCodeActionDeleteVariable(document, context.diagnostics[i].range));
            }
            arryaDiagnostics.push(this.createCommandCodeActionExclude(context.diagnostics[i], document.uri.fsPath));
        }
        return arryaDiagnostics;
    }

    private createCommandCodeActionExclude(diagnostic: vscode.Diagnostic, path: string): vscode.CodeAction {
        const action = new vscode.CodeAction('Exclude error', vscode.CodeActionKind.QuickFix);
        action.command = { command: COMMAND_EXCLUDE_ERROR, title: 'Exclude error tittle', tooltip: 'Exclude error tooltip', arguments: [diagnostic, path] };
        action.diagnostics = [diagnostic];
        // action.isPreferred = true;
        return action;
    }

    private createCommandCodeActionAddNewKey(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction('Add key new', vscode.CodeActionKind.QuickFix);
        action.edit = new vscode.WorkspaceEdit();
        action.edit.insert(document.uri, range.start, 'new ');
        action.isPreferred = true;
        return action;
    }

    private createCommandCodeActionDeleteVariable(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction('Delete variable', vscode.CodeActionKind.QuickFix);
        action.edit = new vscode.WorkspaceEdit();
        action.edit.delete(document.uri, range);
        action.isPreferred = true;
        return action;
    }

    static addExclude(message: string, range: vscode.Range, path: string) {
        if (this.excludesFile != '') {
            let isFileFind = false;
            for (let i = 0; i < ruleExcludeErrors.length; i++) {
                if (ruleExcludeErrors[i].filePath == path) {
                    ruleExcludeErrors[i].errorProps.push({ range: [{ line: range.start.line, character: range.start.character }, { line: range.end.line, character: range.end.character }], message: message });
                    isFileFind = true;
                    if (ruleExcludeErrors[i].errorProps.length > 100) {
                        ruleExcludeErrors[i].errorProps.shift();
                    }
                    break;
                }
            }
            if (!isFileFind) {
                ruleExcludeErrors.push({ filePath: path, errorProps: [{ range: [{ line: range.start.line, character: range.start.character }, { line: range.end.line, character: range.end.character }], message: message }] });
            }
            if (ruleExcludeErrors.length > 100) {
                ruleExcludeErrors.shift();
            }
            const json = JSON.stringify(ruleExcludeErrors);
            fs.writeFileSync(this.excludesFile, json)
        }
    }

    static readFileExclude() {
        const extensionFixline = vscode.extensions.getExtension('Danil.fixline-tool');
        if (extensionFixline == undefined) return;
        const pathResourseFolder = extensionFixline.extensionPath + '/resources';
        this.excludesFile = pathResourseFolder + '/exclude.json';
        const fileData = fs.readFileSync(this.excludesFile, 'utf8');
        ruleExcludeErrors = JSON.parse(fileData);
    }
}
