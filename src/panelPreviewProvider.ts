import * as vscode from 'vscode';

export const panelPreviewProvider = new class implements vscode.TextDocumentContentProvider {
    onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    onDidChange = this.onDidChangeEmitter.event;
    private GetTextScript(position: string, textBlock: string) {
        const specSymbols = new Map([['&quot;', '\"'], ['&lt;', '<'], ['&gt;', '>'], ['&amp;', '&'], ['&apos;', '\'']]);
        let resultText = '';
        let regexpScript = /<script name="(\w+)".*?<!\[CDATA\[(.*?)\]\]><\/script>/gs;
        let resultScript = regexpScript.exec(textBlock);
        while (resultScript) {
            resultText += '//___________[' + position +']_______[' + resultScript[1] + ']_______________________\n';
            if(resultScript == undefined) continue;
            //spec symbols
            let textScript = resultScript[2];
            for(let pair of specSymbols) {
                textScript = textScript.replace(new RegExp(pair[0],'g'), pair[1]);
            }
            resultText += textScript + '\n';
            resultScript = regexpScript.exec(textBlock);
        }
        return resultText;
    }
    provideTextDocumentContent(uri: vscode.Uri): string {
        let text = vscode.window.activeTextEditor?.document.getText();
        let resultText = '';
        if(text == undefined) return '';
        let regexpPanel = /<panel(.*?)<\/events>/gs;
        let resultPanel = regexpPanel.exec(text);
        if(resultPanel) {
            resultText += this.GetTextScript('Panel', resultPanel[1]);
        }			
        let regexp = /<shape Name="(\w+)"(.*?)<\/shape>/gs;
        let result = regexp.exec(text);
        while (result) {
            resultText += this.GetTextScript(result[1], result[2]);
            result = regexp.exec(text);
        }			
        return resultText;
    }
};