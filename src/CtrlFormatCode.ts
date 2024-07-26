import * as vscode from 'vscode';
import { CtrlTokenizer, Token } from './CtrlTokenizer';

export class CtrlCodeFormatter implements vscode.DocumentFormattingEditProvider {
    private iterTabs = 0;
    private document: vscode.TextDocument;
    private bufferChanges: vscode.TextEdit[] = [];
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] | undefined {
        this.initVars();
        this.document = document;
        let tokenizer = new CtrlTokenizer(document);
        let token = tokenizer.getNextToken();
        let prevToken = token;
        let nextToken = token;
        while (token && prevToken) {

            switch (token.symbol) {
                case 'if':
                case 'for':
                case 'switch':
                case 'while':
                    this.addSpacesAfterForIf(token);
                    break;
                case '-':
                    if (['?', '>', '<', '<=', '>=', '==',':', '=', 'return', 'case'].indexOf(prevToken.symbol) < 0) {
                        this.addSpacesBetweenOperator(token);
                    }
                    break;
                case '=':
                case '+':
                case '*':
                case '/':
                case '+=':
                case '-=':
                case '*=':
                case '/=':
                case '&&':
                case '||':
                case '>':
                case '<':
                case '<=':
                case '>=':
                    this.addSpacesBetweenOperator(token);
                    break;
                case '}':
                    nextToken = tokenizer.getNextToken();
                    tokenizer.backToken();
                    this.checkNewLineAfterScope(token, nextToken, -1);
                    this.iterTabs--;
                    this.checkNewLineScope(token, prevToken);
                    break;
                case '{':
                    nextToken = tokenizer.getNextToken();
                    tokenizer.backToken();
                    this.checkNewLineScope(token, prevToken);
                    this.iterTabs++;
                    this.checkNewLineAfterScope(token, nextToken, 0);
                    break;
                case ';':
                    nextToken = tokenizer.getNextToken();
                    tokenizer.backToken();
                    if (nextToken && nextToken?.symbol != '}') {
                        this.checkNewLineAfterExpression(token, nextToken);
                    }
                    break;
                default:
                    break;
            }
            if (token.range.start.line > prevToken.range.start.line) {
                this.checkTabs(token);
                this.checkEmptySpacesEnd(token);
            }
            prevToken = token;
            token = tokenizer.getNextToken();
        }
        return this.bufferChanges;
    }

    private initVars() {
        this.iterTabs = 0;
        this.bufferChanges = [];
    }

    private checkNewLineScope(token: Token, prevToken: Token) {

        if (token.range.start.line == prevToken.range.start.line) {
            this.bufferChanges.push(
                vscode.TextEdit.insert(this.createPosition(token.range.start.line, token.range.start.character), '\n' + '\t'.repeat(this.iterTabs)));
            this.bufferChanges.push(
                vscode.TextEdit.delete(
                    new vscode.Range(
                        this.createPosition(prevToken.range.end.line, prevToken.range.end.character)
                        , this.createPosition(token.range.start.line, token.range.start.character)
                    )));
        }
    }

    private checkNewLineAfterScope(token: Token, nextToken: Token | null, corrTabs: number) {
        if (token.range.start.line == nextToken?.range.start.line) {
            this.checkNewLineAfterExpression(token, nextToken, corrTabs);
        }
        else if (token.range.end.character < this.document.lineAt(token.range.start.line).text.length) {
            if (this.document.lineAt(token.range.start.line).text.charAt(token.range.end.character) != ';') {
                this.bufferChanges.push(
                    vscode.TextEdit.insert(this.createPosition(token.range.end.line, token.range.end.character), '\n' + '\t'.repeat(this.iterTabs)));

            }
        }
    }
    private checkNewLineAfterExpression(token: Token, nextToken: Token, corrTabs: number = 0) {
        if (token.range.start.line == nextToken.range.start.line) {
            let lineText = this.document.lineAt(token.range.start.line).text;
            if (lineText.indexOf('for') > 0) return;
            this.bufferChanges.push(
                vscode.TextEdit.replace(
                    new vscode.Range(
                        this.createPosition(token.range.end.line, token.range.end.character)
                        , this.createPosition(nextToken.range.start.line, nextToken.range.start.character))
                    , '\n' + '\t'.repeat(this.iterTabs + corrTabs)));
        }
    }
    private checkEmptySpacesEnd(token: Token) {
        if (!(token.symbol.startsWith('//') || token.symbol.startsWith('/*'))
            && token.symbol != '}' && token.symbol != '{') {
            let lineText = this.document.lineAt(token.range.start.line).text;
            const prevLengText = lineText.length;
            lineText = lineText.trimEnd();
            if (lineText.length != prevLengText) {
                this.bufferChanges.push(
                    vscode.TextEdit.delete(
                        new vscode.Range(
                            this.createPosition(token.range.start.line, lineText.length),
                            this.createPosition(token.range.start.line, prevLengText))
                    ));
            }
        }
    }
    private checkTabs(token: Token) {
        if (!(token.symbol.startsWith('//') || token.symbol.startsWith('/*'))
            && token.symbol != '}' && token.symbol != '{') {
            let lineText = this.document.lineAt(token.range.start.line).text;
            if (!lineText.startsWith('\t'.repeat(this.iterTabs))) {
                this.bufferChanges.push(
                    vscode.TextEdit.replace(
                        new vscode.Range(this.createPosition(token.range.start.line, 0), this.createPosition(token.range.start.line, token.range.start.character))
                        , '\t'.repeat(this.iterTabs)
                    ));
            }
        }
    }
    private addSpacesAfterForIf(token: Token) {
        let char = this.document.lineAt(token.range.start.line).text.charAt(token.range.end.character);
        if (char != ' ') {
            this.bufferChanges.push(
                vscode.TextEdit.insert(this.createPosition(token.range.end.line, token.range.end.character), ' '));
        }
    }
    private addSpacesBetweenOperator(token: Token) {
        let char = this.document.lineAt(token.range.start.line).text.charAt(token.range.end.character + 1);
        let prevChar = this.document.lineAt(token.range.start.line).text.charAt(token.range.start.character);
        if (prevChar != ' ') {
            this.bufferChanges.push(
                vscode.TextEdit.insert(this.createPosition(token.range.start.line, token.range.start.character + 1), ' '));
        }
        if (char != ' ') {
            this.bufferChanges.push(
                vscode.TextEdit.insert(this.createPosition(token.range.end.line, token.range.end.character + 1), ' '));
        }
    }

    private createPosition(line: number, char: number) {
        return new vscode.Position(line, char);
    }
}