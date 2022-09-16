// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable1 = vscode.commands.registerCommand('extension.OpenPanel', OpenPanel);
	context.subscriptions.push(disposable1);
}
function OpenPanel(uri: vscode.Uri) {
	let path = uri.fsPath;
	if(path.indexOf('\\panels\\') !== -1) {
		path = path.slice(path.indexOf("panels") + 7);
		const terminal = vscode.window.createTerminal('cmd', 'C:\\Windows\\system32\\cmd.exe');
		let conf = getCommands(getConfiguration());
		let command = conf[0].pathWinCC +'/bin/WCCOAui.exe -p ' + path + ' -user ' + conf[0].user + ':' + conf[0].pass + ' -proj ' + conf[0].projName;
		terminal.sendText(command, true);
		terminal.sendText('exit');

	}

}
function getConfiguration() {
    return vscode.workspace
        .getConfiguration()
        .get('OpenPanel.commands');
}
function getCommands(configuration: any) {
    if (!Array.isArray(configuration)) {
        return [];
    }
    return configuration
        .map((c) => {
        const maybeCommand = c;
        return {
            projName: maybeCommand.projName,
            pathWinCC: maybeCommand.pathWinCC,
            user: maybeCommand.user,
            pass: maybeCommand.pass
        };
    });
}
// this method is called when your extension is deactivated
export function deactivate() {}
