// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from "child_process";
import * as fs from 'fs';
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let disposable1 = vscode.commands.registerCommand('extension.OpenPanel', OpenPanel);
    let disposable2 = vscode.commands.registerCommand('extension.CheckScript', CheckScript);
    let disposable3 = vscode.commands.registerCommand('extension.OpenLogs', OpenLog);
	context.subscriptions.push(disposable1);
	context.subscriptions.push(disposable2);
	context.subscriptions.push(disposable3);
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
let doLogs = true;
async function OpenLog() {
    let winccLog_channel = vscode.window.createOutputChannel("WinccLogs");
    winccLog_channel.show(true);
    let path = 'D:/Projects/WinCC_OA_Proj/Configurator/log/';
    let fileNames = getFileNames(path);
    interface MyType {
        [key: string]: number;
    }
    let fileSizes: MyType = {};
    fileNames.forEach(element => {
        fileSizes[element] = fs.statSync(path + element).size;
    })
    while(doLogs) {
        fileNames.forEach(element => {
            let newSizeFile = fs.statSync(path + element).size;
            if(newSizeFile > fileSizes[element])
            {
                let buffer = Buffer.alloc(newSizeFile - fileSizes[element]);
                fs.open(path + element, 'r+', function (err, fd) {
                    if (err) {
                        return console.error(err);
                    }
                    fs.read(fd, buffer, 0, buffer.length,
                        fileSizes[element], function (err, bytes) {
                            if (err) {
                                console.log(err);
                            }
                            if (bytes > 0) {
                                winccLog_channel.append(buffer.
                                    slice(0, bytes).toString());
                            }
                            fs.close(fd, function (err) {
                                if (err) {
                                    console.log(err);
                                }
                            });
                        });
                    fileSizes[element] = newSizeFile;
                });
            }
        })
        await delay(1000);
    }
}

function getFileNames(path: string) : string[]{
    let fileNames = fs.readdirSync(path).filter(element => {
        return element.indexOf('.log') > 0;
    })
    return fileNames;
}
function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

// this method is called when your extension is deactivated
export function deactivate() {}
