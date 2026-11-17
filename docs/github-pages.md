# Публикация на GitHub Pages

Workflow [Deploy to GitHub Pages](../.github/workflows/pages.yml) публикует игру при каждом push в `master`, в том числе после слияния pull request. Он устанавливает зависимости через `npm ci`, проверяет TypeScript, собирает игру на Node.js 24 и публикует содержимое `dist`.

После первого успешного запуска игра будет доступна по адресу:
[Пекарь магнат](https://aleksander-true.github.io/pizza-economics/).

## 1. Подготовить ветку master

Сохрани готовые изменения игры и файлы публикации в коммите и отправь их на GitHub. Локальные незакоммиченные изменения в релиз не попадут.

Сейчас разработка ведётся в `prototype`:

- Если `master` уже есть: открой pull request с `base: master` и `compare: prototype`. Сливай его после включения Pages, описанного ниже.
- Если `master` ещё нет: после отправки подготовленной `prototype` открой вкладку **Code**, выбери `prototype` в списке веток, введи имя `master` и создай новую ветку от `prototype`.

В `master` должны быть исходники, `package.json`, `package-lock.json`, `scripts/build.ts` и `.github/workflows/pages.yml`. Каталог `dist` собирается автоматически; добавлять его в Git не нужно.

В **Settings → General → Default branch** выбери `master`. Это также позволит запускать workflow вручную из вкладки Actions: для ручного запуска файл workflow должен находиться в основной ветке. [Условия ручного запуска](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## 2. Включить Pages на GitHub

1. Открой [настройки Pages репозитория](https://github.com/Aleksander-true/pizza-economics/settings/pages).
2. В **Build and deployment → Source** выбери **GitHub Actions**.
3. Дополнительный шаблон workflow создавать не требуется — файл уже есть в проекте. [Инструкция GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Если Actions отключены, в **Settings → Actions → General** разреши запуск GitHub Actions, включая используемые действия `actions/*`. Отдельные секреты и персональный токен не нужны: права для публикации заданы в workflow.

Если у окружения **Settings → Environments → github-pages** уже есть ограничения на ветки, разреши публикацию из `master`. При первом запуске окружение создаётся автоматически. [Окружение Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 3. Запустить первую публикацию

После настройки Pages слей подготовленный PR в `master` — публикация начнётся автоматически.

Если изменения уже в `master`:

1. Открой [Actions](https://github.com/Aleksander-true/pizza-economics/actions).
2. Выбери **Deploy to GitHub Pages**.
3. Нажми **Run workflow**, выбери ветку `master` и подтверди запуск.
4. Дождись успешного завершения заданий **build** и **deploy**.
5. Открой ссылку у окружения **github-pages** в результате запуска.

Если первая попытка запустилась до включения Pages и завершилась ошибкой, после настройки используй **Re-run all jobs** либо запусти workflow заново.

Проверь опубликованную игру: открой первый день, собери пиццу, приготовь её и перезагрузи страницу — результат должен сохраниться.

## Следующие обновления

Каждый push или слияние PR в `master` публикует новую сборку. Изменения в `prototype` и других ветках не запускают публикацию. Ручной запуск для другой ветки пропускается.

Если сборка не прошла, задание публикации не запускается, а ранее опубликованная версия остаётся доступной. Причину можно увидеть в журнале **Actions → Deploy to GitHub Pages**.

Локально те же команды сборки:

```bash
npm ci
npm run build
```

Игра использует относительные пути к JavaScript и CSS, поэтому работает в подпапке `/pizza-economics/`. Прогресс хранится в браузере на адресе сайта. Сохранения с локального сервера автоматически на GitHub Pages не переносятся; обновление сайта по прежнему адресу их не сбрасывает.
