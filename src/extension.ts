// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


import { CtrlSymbolsCreator } from './ctrlSymbolsCreator';
import { panelPreviewProvider } from './panelPreviewProvider';
import { ProvideCompletionItemsCtrl } from './ctrlProvideCompletionItems';
import { CtrlGoDefinitionProvider } from './CtrlGoDefinitionProvider';
import * as cmdCtrl from './ctrlComands';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenProjectPanel', cmdCtrl.showQuickPick));
	context.subscriptions.push(vscode.commands.registerCommand('extension.RunScript', cmdCtrl.RunScript));
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenPanel', cmdCtrl.OpenPanel));
	context.subscriptions.push(vscode.commands.registerCommand('extension.CheckScript', cmdCtrl.CheckScript));
	context.subscriptions.push(vscode.commands.registerCommand('extension.OpenLogs', cmdCtrl.OpenLog));
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('ctl', panelPreviewProvider));
	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({language: "ctrlpp"}, new CtrlDocumentSymbolProvider()));
	context.subscriptions.push(vscode.languages.registerDefinitionProvider({language: "ctrlpp"}, new CtrlGoDefinitionProvider()));

	const providerCtrl = vscode.languages.registerCompletionItemProvider('ctrlpp', {
		provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
			let provideCompletionItemsCtrl = new ProvideCompletionItemsCtrl();
			provideCompletionItemsCtrl.SetCompletionClass(document, position);
			return provideCompletionItemsCtrl.GetSymbols();
		}
	});
	const providerThis = vscode.languages.registerCompletionItemProvider(
        'ctrlpp',
        {
			provideCompletionItems(document, position) {
				const linePrefix = document.lineAt(position).text.substr(0, position.character);
				let completions = new Array();
				let ctrlSymbolsCreator = new CtrlSymbolsCreator(document);
				let provideCompletionItemsCtrl = new ProvideCompletionItemsCtrl();
				let symbols = ctrlSymbolsCreator.GetSymbols();
				if (linePrefix.endsWith('this.')) {
					for(let i = 0; i < symbols.length; i++) {
						let symbol = symbols[i];
						let isPositionInSymbol = symbol.range.contains(position);
						if(isPositionInSymbol && symbol.kind == vscode.SymbolKind.Class)
						{
							for(let j = 0; j < symbol.children.length; j++) {
								let childSymbol = symbol.children[j];
								provideCompletionItemsCtrl.SetClassMembers(childSymbol);
							}
						}
					}
				}
                return provideCompletionItemsCtrl.GetSymbols();
			}
		},
		'.' // triggered whenever a '.' is being typed
    );

	context.subscriptions.push(vscode.commands.registerCommand('extension.Panelpreview', async () => {
		let fileName = vscode.window.activeTextEditor?.document.fileName;
		if(fileName == undefined || fileName == '') return;
		let uri = vscode.Uri.parse('ctl:' + fileName + Date.now().toString() +'.ctl');
		const doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
		await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
	}))
	context.subscriptions.push(providerCtrl, providerThis);	
}
class CtrlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
	public provideDocumentSymbols(document: vscode.TextDocument,
		token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
	return new Promise((resolve, reject) => {
		let symbols = new CtrlSymbolsCreator(document);
		resolve(symbols.GetSymbols());
	});}
}

// this method is called when your extension is deactivated
export function deactivate() {}
