import * as vscode from 'vscode';
import * as fs from 'fs';

export class CtrlGoDefinitionProvider implements vscode.DefinitionProvider {
	private GetProjectsInConfigFile(): string[] {
		let paths = [];
		let regexp =/proj_path = \"(.*?)\"/g;
		let workspaceFolders = vscode.workspace.workspaceFolders;
		if(workspaceFolders)
		{
			let fsPath = workspaceFolders[0].uri.fsPath;
			if (fs.existsSync(fsPath + '/config/config')) {
				let fileData = fs.readFileSync(fsPath + '/config/config', 'utf8');
				let result;
				while (result = regexp.exec(fileData)) {
					paths.push(result[1])
				}
			}
		}
		return paths;
	}
    public provideDefinition(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        undefined | vscode.Location | Thenable<vscode.Location> {
			let textLine = document.lineAt(position.line).text;
			let location = undefined;
			let regexp = /#uses\s+"(?<library>.*)"/;
			let result = regexp.exec(textLine);
			if(result?.groups) {
				let library = result.groups['library'];
				let paths = this.GetProjectsInConfigFile();
				paths.forEach(path => {
					if(fs.existsSync(path+'/scripts/libs/'+library+'.ctl')) {
						let pathScript = path+'/scripts/libs/'+library+'.ctl';
						let uri = vscode.Uri.file(pathScript);
						new vscode.Position(0, 0);
						let range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
						location =  new vscode.Location(uri, range);
						return location;
					}
				});
			}
			return location;
    }
}