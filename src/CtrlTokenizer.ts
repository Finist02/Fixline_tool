import * as vscode from 'vscode';

export class TextSplitter {
    private lines: string[];
    public lineCount: number;
    readonly text: string;
    private splitterLine = '\n';
    constructor(text: string) {
        if (text.indexOf('\r\n') >= 0) {
            this.splitterLine = '\r\n';
        }
        this.text = text;
        this.lines = this.text.split(this.splitterLine);
        this.lineCount = this.lines.length;
    }
    public lineAt(num: number) {
        return this.lines[num];
    }
    public getText(range: vscode.Range) {
        let text = '';
        if (range.start.line == range.end.line) {
            text = this.lines[range.start.line].slice(range.start.character, range.end.character);
            return text;
        }
        for (let i = range.start.line; i <= range.end.line; i++) {
            if (i == range.start.line) {
                text += this.lines[i].slice(range.start.character, this.lines[i].length) + this.splitterLine;
            }
            else if (i == range.end.line) {
                text += this.lines[i].slice(0, range.end.character)
            }
            else {
                text += this.lines[i] + this.splitterLine;
            }
        }
        return text;
    }
    public getTextWithoutComment(range: vscode.Range) {
        let text = this.getText(range);
        let commentRegExp = /\/\*.*?\*\//gs.exec(text);
        while(commentRegExp) {
            const countNewLines = commentRegExp[0].split('\n');
            if(countNewLines.length > 1) {
                text = text.replace(commentRegExp[0], '\n'.repeat(countNewLines.length-1));
            }
            else {
                text = text.replace(commentRegExp[0], ' '.repeat(commentRegExp[0].length-1));
            }
            commentRegExp = /\/\*.*?\*\//gs.exec(text);
        }
        let lineCommentRegExp = /\/\/.*?\n/gs.exec(text);
        while(lineCommentRegExp) {
                text = text.replace(lineCommentRegExp[0], '\n');
                lineCommentRegExp = /\/\/.*?\n/gs.exec(text);
        }
        return text;
    }
}

export class TokensInLine {
    readonly line: number = 0;
    readonly tokens: Token[] = [];
    constructor(line: number, tokens: Token[]) {
        this.line = line;
        this.tokens = tokens;
    }
}

export class Token {
    readonly range: vscode.Range;
    readonly symbol: string = '';
    constructor(range: vscode.Range, symbol: string) {
        this.range = range;
        this.symbol = symbol;
    }
}

export class CtrlTokenizer {
    private currIdxToken = -1;
    private token: Token[] = [];
    private allTokens: Token[] = [];
    readonly textSplitter: TextSplitter;
    constructor(document: vscode.TextDocument | string) {
        if (typeof document === 'string') {
            this.textSplitter = new TextSplitter(document);
        }
        else {
            this.textSplitter = new TextSplitter(document.getText());
        }
        this.createTokens();
    }
    private createTokens() {
        let bufferToken = '';
        let isCommentString = false;
        for (let i = 0; i < this.textSplitter.lineCount; i++) {
            const line = this.textSplitter.lineAt(i);
            let startTokenLine = i;
            for (let j = 0; j < line.length; j++) {
                if (isCommentString) {
                    isCommentString = false;
                    break;
                }
                let char = line.charAt(j);
                switch (char) {
                    case '/':
                        if (j < line.length - 1) {
                            let nextChar = line.charAt(j + 1);
                            if (nextChar == '*') {
                                let rangeComment = this.findEndComment(i, j);
                                bufferToken = this.textSplitter.getText(rangeComment);
                                if (i != rangeComment.end.line) {
                                    i = rangeComment.end.line;
                                    // isCommentString = true;
                                }
                                j = rangeComment.end.character ;
                                this.token.push(new Token(rangeComment, bufferToken));
                                bufferToken = '';
                                continue;
                            }
                            if (nextChar == '/') {
                                bufferToken = this.textSplitter.getText(this.craeteRange(i, j, line.length));
                                this.token.push(new Token(this.craeteRange(i, j, line.length), bufferToken));
                                bufferToken = '';
                                isCommentString = true;
                                continue;
                            }
                        }
                        break;
                    case '"':
                        let rangeComment = this.findEndStringLiteral(i, j);
                        bufferToken = this.textSplitter.getText(rangeComment);
                        i = rangeComment.end.line;
                        j = rangeComment.end.character - 1;
                        this.token.push(new Token(rangeComment, bufferToken));
                        bufferToken = '';
                        continue;
                    case '-':
                    case '+':
                    case '=':
                    case '<':
                    case '>':
                    case '*':
                    case '/':
                    case '%':
                    case '!':
                    case '&':
                    case '|':
                        if (bufferToken != '' && (char == '<' || char == '>')) {
                            this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                            this.token.push(new Token(this.craeteRange(i, j - 1, j), char));
                            bufferToken = '';
                            continue;
                        }
                        else if (j < line.length - 1 && line.charAt(j + 1).match(/\-|\+|\=|\<|\>|\*|\/|\%|\!|\&|\|/)) {
                            if (bufferToken != '') {
                                this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                            }
                            bufferToken = char + line.charAt(j + 1);
                            j++;
                            this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                            bufferToken = '';
                            continue;
                        }
                        else {
                            if (bufferToken != '') {
                                this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                            }
                            this.token.push(new Token(this.craeteRange(i, j - 1, j), char));
                            bufferToken = '';
                            continue;
                        }
                        continue;
                    case '}':
                    case '{':
                    case ';':
                    case ',':
                    case ')':
                    case '(':
                    case ']':
                    case '[':
                    case '.':
                    case ':':
                        if (bufferToken != '') {
                            this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                        }
                        this.token.push(new Token(this.craeteRange(i, j, j + 1), char));
                        bufferToken = '';
                        continue;
                    case ' ':
                    case '\t':
                        if (bufferToken != '') {
                            this.token.push(new Token(this.craeteRange(i, j - bufferToken.length, j), bufferToken));
                        }
                        bufferToken = '';
                        continue;
                    default:
                        break;
                }
                bufferToken += char;
                if (bufferToken != '' && j == line.length - 1) {
                    this.token.push(new Token(this.craeteRange(i, j - bufferToken.length + 1, j + 1), bufferToken));
                    bufferToken = '';
                }
            }
            this.allTokens = this.allTokens.concat(this.token);
            this.token = [];
        }
    }

    public getNextToken() {
        this.currIdxToken++;
        if (this.currIdxToken < this.allTokens.length) {
            return this.allTokens[this.currIdxToken];
        }
        return null;
    }
    public backToken() {
        this.currIdxToken--;
    }
    private craeteRange(lineNumber: number, start: number, end: number) {
        return new vscode.Range(new vscode.Position(lineNumber, start), new vscode.Position(lineNumber, end));
    }
    private findEndComment(lineNumber: number, position: number) {
        let i = lineNumber, j = position;
        for (i; i < this.textSplitter.lineCount; i++) {
            const line = this.textSplitter.lineAt(i);
            if (i != lineNumber) {
                j = 0;
            }
            for (j; j < line.length - 1; j++) {
                let findToken = line.charAt(j) + line.charAt(j + 1);
                if (findToken == '*/') {
                    return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j + 2));
                }
            }
        }
        return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j));
    }

    private findEndStringLiteral(lineNumber: number, position: number) {
        let i = lineNumber, j = position + 1;
        for (i; i < this.textSplitter.lineCount; i++) {
            const line = this.textSplitter.lineAt(i);
            if (i != lineNumber) {
                j = 0;
            }
            for (j; j < line.length; j++) {
                let findToken = line.charAt(j);
                if (findToken == '"' && line.charAt(j - 1) != '\\') {
                    return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j + 1));
                }
            }
        }
        return new vscode.Range(new vscode.Position(lineNumber, position), new vscode.Position(i, j));
    }
}

