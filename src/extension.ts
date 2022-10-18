// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from "child_process";
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable1 = vscode.commands.registerCommand('extension.OpenPanel', OpenPanel);
    let disposable2 = vscode.commands.registerCommand('extension.CheckScript', CheckScript);
	context.subscriptions.push(disposable1);
	context.subscriptions.push(disposable2);
}
function OpenPanel(uri: vscode.Uri) {
    let path = uri?.fsPath;
    if(path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
    if(path == undefined || path == '') return;
	if(path.indexOf('\\panels\\') !== -1) {
		path = path.slice(path.indexOf("panels") + 7);
		let conf = getCommands(getConfiguration());
		let command = conf[0].pathWinCC +'/bin/WCCOAui.exe -p ' + path + ' -user ' + conf[0].user + ':' + conf[0].pass + ' -proj ' + conf[0].projName;
        const output = execShell(command);

	}

}
function CheckScript(uri: vscode.Uri) {
    let path = uri?.fsPath;
    if(path == undefined) path = vscode.window.activeTextEditor?.document.uri.fsPath!;
    if(path == undefined || path == '') return;
	if(path.indexOf('\\scripts\\') !== -1) {
		path = path.slice(path.indexOf("scripts") + 8);
		let conf = getCommands(getConfiguration());
		let command = conf[0].pathWinCC +'/bin/\WCCOActrl.exe -syntax -proj ' + conf[0].projName + ' ' + path;
        const output = execShell(command);
	}

}
const execShell = (cmd: string) =>
    new Promise<string>((resolve, reject) => {
      cp.exec(cmd, (err, out) => {
        if (err) {
          return resolve('error!');
          //or,  reject(err);
        }
        return resolve(out.toString());
      });
    });
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
