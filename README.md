# wincc_tool
Расширение для VSCode. В настройках прописать пользователь пароль. Открыть папку с проектом, конфиг файл проекта считываетя автоматически.
## Основные команды:
- **Open panel** - открыть панель. Есть иконка сверху
- **Panelpreview** - посмотреть код панели
![panel](images/preview.gif "Запуск панели")
- **RunScript** - запуск скрипта
- **CheckScript** - проверить скрипт, вызывается приложение WCCOActrl.exe, которое отображает в логах строку с ошибкой если таковая имеется. Есть иконка сверху
![script](images/runScript.gif "Запуск скрипта")
  Помимо этого, если создан юнит тест для скрипта, **CheckScript** запускает его
![test](images/runTest.gif "Запуск теста")
- **OpenLogs** - создает output канал который отображает логи. Для большего удобства рекомендуется установить расширение https://marketplace.visualstudio.com/items?itemName=IBM.output-colorizer
![log](images/openLog.gif "Запуск логов")
- **OpenProjectPanel** - открытие панели командой
![log](images/openAnyPanel.gif "Запуск любой панели")
