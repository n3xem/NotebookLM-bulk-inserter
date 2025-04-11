// 拡張機能がインストールされたときに右クリックメニューを作成
chrome.runtime.onInstalled.addListener(() => {
  // メインメニューを作成
  chrome.contextMenus.create({
    id: "arrayPasterMenu",
    title: "NotebookLM BulkInserter",
    contexts: ["editable"],
  });

  // 「次の文字列を貼り付け」メニューを作成
  chrome.contextMenus.create({
    id: "pasteNext",
    parentId: "arrayPasterMenu",
    title: "次のアイテムを貼り付け",
    contexts: ["editable"],
  });

  // 「すべての文字列を貼り付け」メニューを作成
  chrome.contextMenus.create({
    id: "pasteAll",
    parentId: "arrayPasterMenu",
    title: "すべてのアイテムを貼り付け（改行区切り）",
    contexts: ["editable"],
  });

  // NotebookLMでの自動貼り付けメニューを作成
  chrome.contextMenus.create({
    id: "autoNotebookPaste",
    parentId: "arrayPasterMenu",
    title: "NotebookLMで自動挿入",
    contexts: ["all"],
  });
});

// コンテキストメニューのクリックイベントを処理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pasteNext") {
    // 次の文字列を貼り付け
    pasteNextString(tab);
  } else if (info.menuItemId === "pasteAll") {
    // すべての文字列を貼り付け
    pasteAllStrings(tab);
  } else if (info.menuItemId === "autoNotebookPaste") {
    // NotebookLMでの自動貼り付け
    if (tab.url.includes("notebooklm.google.com")) {
      startNotebookAutoPaste(tab);
    } else {
      // 通知またはアラートを表示することも可能
      console.log("このコマンドはNotebookLM上でのみ動作します");
    }
  }
});

// 次の文字列を貼り付ける関数
function pasteNextString(tab) {
  chrome.storage.local.get(["strings"], function (result) {
    const strings = result.strings || [];

    if (strings.length > 0) {
      // 最初の文字列を取得
      const stringToPaste = strings[0];

      // 残りの文字列を保存
      const remainingStrings = strings.slice(1);
      chrome.storage.local.set({ strings: remainingStrings }, function () {
        // 文字列を貼り付け
        pasteText(tab, stringToPaste);
      });
    }
  });
}

// すべての文字列を改行区切りで貼り付ける関数
function pasteAllStrings(tab) {
  chrome.storage.local.get(["strings"], function (result) {
    const strings = result.strings || [];

    if (strings.length > 0) {
      // 全ての文字列を改行区切りで結合
      const textToPaste = strings.join("\n");

      // 文字列リストをクリア
      chrome.storage.local.set({ strings: [] }, function () {
        // 文字列を貼り付け
        pasteText(tab, textToPaste);
      });
    }
  });
}

// 指定したテキストをアクティブなタブに貼り付ける関数
function pasteText(tab, text) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (textToPaste) => {
      // フォーカスされている要素にテキストを挿入
      const activeElement = document.activeElement;

      if (
        activeElement &&
        (activeElement.isContentEditable ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "INPUT")
      ) {
        // 現在のカーソル位置を取得
        const startPos = activeElement.selectionStart || 0;
        const endPos = activeElement.selectionEnd || 0;

        if (activeElement.isContentEditable) {
          // contentEditableの場合
          document.execCommand("insertText", false, textToPaste);
        } else {
          // input や textarea の場合
          const currentValue = activeElement.value;
          activeElement.value =
            currentValue.substring(0, startPos) +
            textToPaste +
            currentValue.substring(endPos);

          // カーソル位置を更新
          activeElement.selectionStart = activeElement.selectionEnd =
            startPos + textToPaste.length;

          // 変更イベントを発火させる
          const event = new Event("input", { bubbles: true });
          activeElement.dispatchEvent(event);
        }
      }
    },
    args: [text],
  });
}

// NotebookLMでの自動貼り付けを開始する関数
function startNotebookAutoPaste(tab) {
  console.log(
    "startNotebookAutoPaste関数が呼び出されました。タブ:",
    tab.id,
    tab.url
  );

  chrome.storage.local.get(["strings"], function (result) {
    const strings = result.strings || [];
    console.log("キューにあるURL数:", strings.length);

    if (strings.length > 0) {
      // 最初のURLを取得
      const urlToPaste = strings[0];
      console.log("貼り付け予定のURL:", urlToPaste);

      // 残りの文字列を保存
      const remainingStrings = strings.slice(1);
      chrome.storage.local.set({ strings: remainingStrings }, function () {
        console.log("URLキューを更新しました。残り:", remainingStrings.length);
        // 自動貼り付け処理を実行
        executeNotebookAutoPaste(tab, urlToPaste);
      });
    } else {
      // キューが空の場合の処理
      console.log("URLキューが空です");
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          alert("貼り付けるURLがありません。URLを追加してください。");
        },
      });
    }
  });
}

// NotebookLMでの自動貼り付け処理を実行する関数
function executeNotebookAutoPaste(tab, url) {
  console.log("executeNotebookAutoPaste関数が呼び出されました。URL:", url);

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: (urlToPaste) => {
        console.log("タブ内で自動貼り付けスクリプトを実行中。URL:", urlToPaste);

        async function wait(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        async function performSequence() {
          console.log("performSequence開始");

          // 1. 「ソースを追加」をクリック
          const addSourceButton = document.querySelector(
            '[aria-label="ソースを追加"]'
          );
          console.log("「ソースを追加」ボタン:", addSourceButton);

          if (addSourceButton) {
            addSourceButton.click();
            console.log("「ソースを追加」ボタンをクリック");
            await wait(2000);

            // 2. 「ウェブサイト」をクリック
            const websiteButton = [...document.querySelectorAll("span")].find(
              (span) => span.textContent.trim() === "ウェブサイト"
            );
            console.log("「ウェブサイト」ボタン:", websiteButton);

            if (websiteButton) {
              websiteButton.click();
              console.log("「ウェブサイト」ボタンをクリック");
              await wait(2000);

              // 3. URL を入力
              const input = document.querySelector(
                'input[formcontrolname="newUrl"]'
              );
              console.log("URL入力フィールド:", input);

              if (input) {
                input.value = urlToPaste;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                console.log("URLを入力:", urlToPaste);
                await wait(2000);

                // 4. 「挿入」をクリック
                const insertButton = [
                  ...document.querySelectorAll("span"),
                ].find((span) => span.textContent.trim() === "挿入");
                console.log("「挿入」ボタン:", insertButton);

                if (insertButton) {
                  insertButton.click();
                  console.log("「挿入」ボタンをクリック");
                  await wait(2000);

                  // 挿入完了を通知
                  console.log("バックグラウンドスクリプトに完了を通知");
                  chrome.runtime.sendMessage({
                    action: "notebookPasteComplete",
                  });
                } else {
                  console.error("「挿入」ボタンが見つかりませんでした");
                }
              } else {
                console.error("URL入力フィールドが見つかりませんでした");
              }
            } else {
              console.error("「ウェブサイト」ボタンが見つかりませんでした");
            }
          } else {
            console.error("「ソースを追加」ボタンが見つかりませんでした");
          }
        }

        // 実行
        performSequence().catch((error) => {
          console.error("自動貼り付け処理中にエラーが発生しました:", error);
        });
      },
      args: [url],
    },
    (results) => {
      if (chrome.runtime.lastError) {
        console.error("スクリプト実行エラー:", chrome.runtime.lastError);
      } else {
        console.log("スクリプトが実行されました:", results);
      }
    }
  );
}

// メッセージを監視して、挿入が完了したら次のURLを処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("バックグラウンドでメッセージを受信:", message);

  if (message.action === "notebookPasteComplete") {
    console.log("notebookPasteComplete メッセージを受信");
    chrome.storage.local.get(["strings"], function (result) {
      const strings = result.strings || [];
      console.log("残りの文字列数:", strings.length);

      if (strings.length > 0) {
        // まだURLが残っている場合は、次の処理を開始
        console.log("次のURLの処理を開始します");
        startNotebookAutoPaste(sender.tab);
      } else {
        // すべてのURLの処理が完了したことを通知
        console.log("すべてのURLの処理が完了しました");
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          func: () => {
            alert("すべてのURLの挿入が完了しました。");
          },
        });
      }
    });
  } else if (message.action === "startNotebookAutoPaste") {
    console.log(
      "startNotebookAutoPaste メッセージを受信。tabId:",
      message.tabId
    );

    // ポップアップからのリクエストでNotebookLMの自動貼り付けを開始
    chrome.tabs.get(message.tabId, function (tab) {
      if (chrome.runtime.lastError) {
        console.error("タブ取得エラー:", chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
        return;
      }

      console.log("タブ情報を取得:", tab.url);
      startNotebookAutoPaste(tab);
      sendResponse({ success: true });
    });

    // 非同期レスポンスを可能にするためにtrueを返す
    return true;
  }
});
