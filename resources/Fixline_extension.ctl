// $License: NOLICENSE
//--------------------------------------------------------------------------------
/**
	@file $relPath
	@copyright $copyright
	@author user
*/

//--------------------------------------------------------------------------------
// Libraries used (#uses)
#uses "CtrlHTTP"

//--------------------------------------------------------------------------------
// Variables and Constants

//--------------------------------------------------------------------------------
/**
*/
enum typeNode
{
	System,
	Dpt,
	Dp,
	DpeStruct,
	DpeEl
};

main()
{
	httpServer(false, 5080, 0);
	httpConnect("HandleRequest", "/api");
}

dyn_string HandleRequest(dyn_string headers, dyn_string values)
{
	string val;
	if (dynlen(headers) == 0) return makeDynString(val, "Status: 200 OK");
	switch (headers[1])
	{
		case "getSystems" :
		{
			dyn_string systems;
			dyn_uint ids;
			getSystemNames(systems, ids);
			mapping m = makeMapping("dpes", systems, "values", "", "typeNodes", makeDynInt());
			for (int i = 1; i <= dynlen(systems); i++)
			{
				dynAppend(m["typeNodes"], (int)typeNode::System);
			}
			return makeDynString(jsonEncode(m) , "Status: 200 OK");
		}
		case "getDpts" :
		{
			dyn_string dpts = dpTypes("*", getSystemId(values[1]));
			mapping m = makeMapping("dpes", makeDynString("_"), "values", "", "typeNodes", makeDynInt((int)typeNode::Dpt));
			for (int i = 1; i <= dynlen(dpts); i++)
			{
				if (!patternMatch("_*", dpts[i]))
				{
					dynAppend(m["dpes"], dpts[i]);
					dynAppend(m["typeNodes"], (int)typeNode::Dpt);
				}
			}
			return makeDynString(jsonEncode(m) , "Status: 200 OK");
		}
		case "getInnerDpts" :
		{
			dyn_string dpts = dpTypes("*", getSystemId(values[1]));
			mapping m = makeMapping("dpes", makeDynString(), "values", "", "typeNodes", makeDynInt());
			for (int i = 1; i <= dynlen(dpts); i++)
			{
				if (patternMatch("_*", dpts[i]))
				{
					dynAppend(m["dpes"], dpts[i]);
					dynAppend(m["typeNodes"], (int)typeNode::Dpt);
				}
			}
			return makeDynString(jsonEncode(m) , "Status: 200 OK");
		}
		case "getDps" :
		{
			dyn_string dpts = dpNames(values[2] + "*", values[1]);

			mapping m = makeMapping("dpes", makeDynString(), "values", "", "typeNodes", makeDynInt());
			for (int i = 1; i <= dynlen(dpts); i++)
			{
				dynAppend(m["dpes"], dpts[i]);
				dynAppend(m["typeNodes"], (int)typeNode::Dp);
			}
			return makeDynString(jsonEncode(m) , "Status: 200 OK");
		}
		case "getDpes" :
		{
			dyn_string dpes = dpNames(values[2] + values[1] + ".*");
			mapping m = makeMapping("dpes", makeDynString(), "values", "", "typeNodes", makeDynInt());
			for (int i = 1; i <= dynlen(dpes); i++)
			{
				dynAppend(m["dpes"], dpes[i]);
				int elType = dpElementType(dpes[i]);
				if(elType == DPEL_STRUCT)
				{
					dynAppend(m["typeNodes"], (int)typeNode::DpeStruct);
				}
				else
				{
					dynAppend(m["typeNodes"], (int)typeNode::DpeEl);
				}
			}
			return makeDynString(jsonEncode(m) , "Status: 200 OK");
		}
		case "searchDpes" :
		{
			dyn_string dpes = dpNames(values[1]);
			mapping m = makeMapping("dpes", makeDynString(), "values", "", "typeNodes", makeDynInt());
			for (int i = 1; i <= dynlen(dpes); i++)
			{
				dynAppend(m["dpes"], dpes[i]);
				int elType = dpElementType(dpes[i]);
				if(elType == DPEL_STRUCT)
				{
					dynAppend(m["typeNodes"], (int)typeNode::DpeStruct);
				}
				else
				{
					dynAppend(m["typeNodes"], (int)typeNode::DpeEl);
				}
			}
			return makeDynString(jsonEncode(m) , "Status: 200 OK");
		}
		case "getHistory" :
		{
			mapping m = makeMapping("dpes", makeDynString(), "values", GetHistory(values[1] ), "typeNodes", makeDynInt());
			return makeDynString(jsonEncode(m) , "Status: 200 OK");
		}
		default :
		{
			//do something;
			break;
		}
	}
	return makeDynString(val, "Status: 200 OK");

}



string GetHistory(string dpe)
{
	anytype val;
	dpGet(dpe, val);
	string ans = "<h2>" + dpe + "</h2>";
	ans += "<h3>Текущее значение:</h3> <pre> <code>" + val + "</code></pre>";
	string t1 = getCurrentTime() - 24 * 60 * 60;
	string t2 = getCurrentTime();
	string q = "SELECT '_original.._value', '_original.._stime' FROM '" + dpSubStr(dpe,DPSUB_DP_EL)
							+ "' REMOTE '" + dpSubStr(dpe,DPSUB_SYS) + "' TIMERANGE(\"" + t1 + "\",\"" + t2 + "\",1,0)";
	dyn_dyn_anytype data;
	dpQuery(q, data);

	ans += "<h4>Значение за последние сутки:</h4>";
	ans += "<table style=\"width: 50%; border-collapse: collapse; border-color: #E6FFEE;\" border=\"1\">"
		+ "<tbody><tr>"
		+ "<td><strong>DPE </strong></td><td><strong>VALUE</strong></td><td><strong>TIME</strong></td>";
	for (int i = 2; i <= dynlen(data); i++)
	{
		ans += "<tr><td>" + data[i][1] + "</td><td>" + data[i][2] + "</td><td>" + (string)data[i][3] + "</td></tr>";
	}
	ans += "</tbody></table>";
	return ans;
}