import * as fs from 'fs';
import * as vscode from 'vscode';
import { QuickPickItem } from 'vscode';
import { QuickPickItemKind} from 'vscode';
import { GetPvssPath } from './СtrlComands';
import { CtrlSymbolsCreator, TypeQuery } from './ctrlSymbolsCreator';

export async function CreateChildClass() {
    const document = vscode.window.activeTextEditor?.document;
	if(document == undefined) return;
    let items: QuickPickItem[] = [];
    const symbolsCreator = new CtrlSymbolsCreator(document, TypeQuery.protectedSymbols);
    const symbols = symbolsCreator.GetSymbols();
    if(symbols.length == 0) return;
    symbols.forEach(symbol => {
        items.push({
            label: symbol.name
		});
    });
	const selectedClass = await vscode.window.showQuickPick(items);
    if(selectedClass != undefined) {
        symbols.forEach(symbol => {
            if(symbol.name == selectedClass.label) {
                items = [];
                symbol.children.forEach(child => {
                    let type = '';
                    if(child.kind ==  vscode.SymbolKind.Method || child.kind ==  vscode.SymbolKind.Function) {
                        type = 'method';
                        items.push({
                            label: child.detail + ' ' + child.name,
                            description: type
                        });
                    }
                });
                return;
            }
        });
        let newMembers = await vscode.window.showQuickPick(items, {canPickMany : true});
        if(newMembers == undefined) {
            newMembers = [];
        }
        const newNameClass = await vscode.window.showInputBox({
            placeHolder: 'Введите имя нового класса',
            prompt: 'Введите имя нового класса',
            value: selectedClass.label
        });
        if(newNameClass != undefined && newNameClass != '')
        {
            let fsPath = document.uri.fsPath;
            let fsPathNewClass = "file:" + fsPath + 'child.ctl';
            const regExpResult = /(.*\\)(.*).ctl/.exec(fsPath);
            if(regExpResult && regExpResult[2]) {
                fsPathNewClass = "file:" + regExpResult[1] + newNameClass + '.ctl';
            }
            let uriChildClass = vscode.Uri.parse(fsPathNewClass);
            if (!fs.existsSync(fsPathNewClass)) {
                let resultReg = /scripts\\libs\\(.*).ctl/.exec(fsPath);
                let fileData = fileTemplate;
                if(resultReg && resultReg[1])
                {
                    let origLibRelPathWithoutExtension = resultReg[1].replace(/\\/g, '/');
                    fileData = fileData.replace('$origLibRelPathWithoutExtension', origLibRelPathWithoutExtension);
                    fileData = fileData.replace('$methodsClass', GetMethods(newMembers));
                    fileData = fileData.replace(/\$childClassName/g, newNameClass);
                    fileData = fileData.replace(/\$origClass/g, selectedClass.label);

                }
                const writeBytes = Buffer.from(fileData);
                vscode.workspace.fs.writeFile(uriChildClass, writeBytes).then(() => {
                    OpenFileVscode(uriChildClass);
                });
            }
            else
            {
                vscode.window.showErrorMessage('Файл уже существует ' + fsPathNewClass);
            }
           
        }
    }	
}

const OpenFileVscode = (setting: vscode.Uri) => {
	vscode.workspace.openTextDocument(setting).then((a: vscode.TextDocument) => {
		vscode.window.showTextDocument(a, 1, false)
	})
}

function GetMethods(items: QuickPickItem[]) {
    let result = '';
    items.forEach(item => {
        result += '\n\tpublic ' + item.label + '()\n\t{\n\t\n\t}\n';
    });
    return result;
}


const fileTemplate = 
`// $License: NOLICENSE
//----------------------------------------------------------------------------------------
/**
	@file $relPath
	@copyright $copyright
	@author $author
*/

//----------------------------------------------------------------------------------------
// Libraries used (#uses)
#uses "$origLibRelPathWithoutExtension"

//----------------------------------------------------------------------------------------
// Variables and Constants

//----------------------------------------------------------------------------------------
/**
*/
class $childClassName : $origClass
{
//----------------------------------------------------------------------------------------
//@private members
//----------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------
//@public members
//----------------------------------------------------------------------------------------

//----------------------------------------------------------------------------------------
/**
	@brief Конструктор
	@param 
*/
    public $childClassName() : $origClass()
    {

    }
$methodsClass
};`
