// ============================================================
// z-data Task Management — Google Apps Script Backend
// ============================================================

const SPREADSHEET_ID = '1DshSRGLfD-mmAWp4Q4YOtdUNFxLCUqj41PZdYQe3nr4';
const TASK_SHEET = 'Task list';
const CATEGORY_SHEET = 'Category master';
const STATUS_SHEET = 'Status master';
const PIC_SHEET = 'PIC master';
const USERS_SHEET = 'Users';

const ASSIGNEE_SEPARATOR = '/';
const TOKEN_TTL_DAYS = 30;

// ============================================================
// セットアップ系（手動実行）
// ============================================================

// Usersシートを新規作成（id, name, pic, salt, passwordHash, token, tokenExpire）
function setupUsersSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(USERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(USERS_SHEET);
  } else {
    sheet.clear();
  }
  sheet.appendRow(['id', 'name', 'pic', 'salt', 'passwordHash', 'token', 'tokenExpire']);
  sheet.setFrozenRows(1);
  Logger.log('Usersシートを準備しました。registerUser() を実行してください。');
}

// ユーザー登録（手動実行用）
// 使用例: registerUser('keita', 'Keita Ishida', 'Keita', 'INITIAL_PW_HERE')
function registerUser(id, name, pic, password) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET);
  if (!sheet) throw new Error('Usersシートがありません。先に setupUsersSheet() を実行してください。');
  const salt = Utilities.getUuid();
  const hash = hashPassword(password, salt);
  sheet.appendRow([id, name, pic, salt, hash, '', '']);
  Logger.log('登録: id=' + id + ' / pic=' + pic);
}

// 全ユーザーを一括登録（初回セットアップ用）
function bulkRegisterUsers() {
  setupUsersSheet();
  // ここでパスワードを変更してから実行
  registerUser('keita', 'Keita Ishida', 'Keita', 'CHANGE_ME_KEITA');
  registerUser('harry', 'Kazuma Harigae', 'Harry', 'CHANGE_ME_HARRY');
  registerUser('takumi', 'Takumi Uematsu', 'Takumi', 'CHANGE_ME_TAKUMI');
  Logger.log('全ユーザー登録完了。');
}

// パスワードリセット（特定ユーザーのPWを更新）
function resetUserPassword(id, newPassword) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      const salt = Utilities.getUuid();
      const hash = hashPassword(newPassword, salt);
      sheet.getRange(i + 1, 4).setValue(salt);
      sheet.getRange(i + 1, 5).setValue(hash);
      sheet.getRange(i + 1, 6).setValue(''); // token無効化
      Logger.log('パスワードリセット: ' + id);
      return;
    }
  }
  throw new Error('該当ユーザーなし: ' + id);
}

// ============================================================
// Web API エントリポイント
// ============================================================

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    let body = {};
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    const action = body.action;

    // login だけは認証不要
    if (action === 'login') {
      return jsonResponse({ success: true, data: handleLogin(body) });
    }

    // それ以外は token + pic チェック
    const user = authenticate(body.token, body.pic);
    if (!user) {
      return jsonResponse({ success: false, error: '認証エラー（再ログインしてください）' });
    }

    switch (action) {
      case 'getTasks':       return jsonResponse({ success: true, data: getTasks() });
      case 'getCategories':  return jsonResponse({ success: true, data: getCategories() });
      case 'getStatuses':    return jsonResponse({ success: true, data: getStatuses() });
      case 'getPics':        return jsonResponse({ success: true, data: getPics() });
      case 'addTask':        return jsonResponse({ success: true, data: addTask(body) });
      case 'updateTask':     return jsonResponse({ success: true, data: updateTask(body) });
      case 'deleteTask':     return jsonResponse({ success: true, data: deleteTask(body) });
      case 'changePassword': return jsonResponse({ success: true, data: changePassword(user, body) });
      default: return jsonResponse({ success: false, error: '不明なアクション: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// 認証
// ============================================================

function hashPassword(password, salt) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + ':' + salt,
    Utilities.Charset.UTF_8
  );
  return raw.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function handleLogin(body) {
  const id = String(body.id || '').toLowerCase();
  const password = String(body.password || '');
  if (!id || !password) throw new Error('IDとパスワードを入力してください');

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET);
  if (!sheet) throw new Error('Usersシートがありません');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === id) {
      const salt = data[i][3];
      const expected = data[i][4];
      if (hashPassword(password, salt) !== expected) {
        throw new Error('IDまたはパスワードが違います');
      }
      // tokenを発行
      const token = Utilities.getUuid();
      const expire = new Date();
      expire.setDate(expire.getDate() + TOKEN_TTL_DAYS);
      sheet.getRange(i + 1, 6).setValue(token);
      sheet.getRange(i + 1, 7).setValue(expire);
      return {
        token: token,
        pic: data[i][2],
        name: data[i][1],
      };
    }
  }
  throw new Error('IDまたはパスワードが違います');
}

// 認証成功時はユーザー情報を返す、失敗時は null
function authenticate(token, pic) {
  if (!token || !pic) return null;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === pic && data[i][5] === token) {
      const expire = data[i][6];
      if (expire instanceof Date && expire.getTime() > now.getTime()) {
        return { row: i + 1, id: data[i][0], name: data[i][1], pic: data[i][2] };
      }
      return null; // 期限切れ
    }
  }
  return null;
}

function changePassword(user, body) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET);
  const currentRow = sheet.getRange(user.row, 1, 1, 7).getValues()[0];
  const salt = currentRow[3];
  const expected = currentRow[4];
  if (hashPassword(body.currentPassword, salt) !== expected) {
    throw new Error('現在のパスワードが違います');
  }
  if (!body.newPassword || body.newPassword.length < 4) {
    throw new Error('新パスワードは4文字以上必要です');
  }
  const newSalt = Utilities.getUuid();
  sheet.getRange(user.row, 4).setValue(newSalt);
  sheet.getRange(user.row, 5).setValue(hashPassword(body.newPassword, newSalt));
  return true;
}

// ============================================================
// タスク CRUD
// 列: A=大カテゴリ, B=小カテゴリ, C=タスク, D=担当者, E=期日, F=ステータス
// ============================================================

function getTasks() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASK_SHEET);
  const data = sheet.getDataRange().getValues();
  const tasks = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[2]) continue;
    tasks.push({
      rowIndex: i + 1,
      majorCategory: row[0],
      minorCategory: row[1],
      task: row[2],
      assignees: parseAssignees(row[3]),
      dueDate: formatDate(row[4]),
      status: row[5],
    });
  }
  return tasks;
}

function addTask(body) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASK_SHEET);
  sheet.appendRow([
    body.majorCategory,
    body.minorCategory,
    body.task,
    serializeAssignees(body.assignees),
    body.dueDate,
    body.status || '未着手',
  ]);
  return getTasks();
}

function updateTask(body) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASK_SHEET);
  const row = body.rowIndex;
  if (!row || row < 2) throw new Error('無効な行番号');
  sheet.getRange(row, 1).setValue(body.majorCategory);
  sheet.getRange(row, 2).setValue(body.minorCategory);
  sheet.getRange(row, 3).setValue(body.task);
  sheet.getRange(row, 4).setValue(serializeAssignees(body.assignees));
  sheet.getRange(row, 5).setValue(body.dueDate);
  sheet.getRange(row, 6).setValue(body.status);
  return getTasks();
}

function deleteTask(body) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TASK_SHEET);
  const row = body.rowIndex;
  if (!row || row < 2) throw new Error('無効な行番号');
  sheet.deleteRow(row);
  return getTasks();
}

// ============================================================
// カテゴリ (read-only)
// 列: A=大カテゴリ, B=小カテゴリ, C=担当者(目安)
// ============================================================

function getCategories() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CATEGORY_SHEET);
  const data = sheet.getDataRange().getValues();
  const categories = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    categories.push({
      rowIndex: i + 1,
      majorCategory: data[i][0],
      minorCategory: data[i][1],
      defaultAssignees: parseAssignees(data[i][2]),
    });
  }
  return categories;
}

// ============================================================
// ステータス・PIC
// ============================================================

function getStatuses() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STATUS_SHEET);
  const data = sheet.getDataRange().getValues();
  const statuses = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) statuses.push(data[i][0]);
  }
  return statuses;
}

function getPics() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PIC_SHEET);
  const data = sheet.getDataRange().getValues();
  const pics = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) pics.push(data[i][0]);
  }
  return pics;
}

// ============================================================
// ユーティリティ
// ============================================================

function parseAssignees(value) {
  if (!value) return [];
  return String(value).split(ASSIGNEE_SEPARATOR).map(s => s.trim()).filter(Boolean);
}

function serializeAssignees(arr) {
  if (!arr || !arr.length) return '';
  return arr.join(ASSIGNEE_SEPARATOR);
}

function formatDate(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return (value.getMonth() + 1) + '/' + value.getDate();
  }
  return String(value);
}
