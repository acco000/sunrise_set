'use strict';

//パッケージの準備
const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

//ローカル（自分のPC）でサーバーを公開するときのポート番号
const PORT = process.env.PORT || 8000;

// Messaging APIで利用するクレデンシャル（秘匿情報）<<< 第三者に見せない
const config = {
    
};


// ########## ▼▼▼ サンプル関数 ▼▼▼ ##########
const sampleFunction = async (event) => {
  // ユーザーメッセージが「日の出」か「日の入り」かどうか
  if (event.message.text === '日の出'){
      // 「リプライ」を使って先に返事しておきます
      await client.replyMessage(event.replyToken, {
          type: 'text',
          text: '調べています……'
      });

      let pushText = '';
      try {
          // axiosで日の出日の入り時刻のAPIを叩きます（少し時間がかかる・ブロッキングする）
          const res = await axios.get('https://api.sunrise-sunset.org/json?lat=34.6959484&lng=135.4927352');
          // 取得できるのはUTCなので日本時間（+9時間）になおす
          const utc_time = res.data.results.sunrise;
          // '時', '分', '秒 PM' に分割する
          const tm_split = utc_time.split(':');
          // '時' を9時間進めて12時間戻す（13時を過ぎないようにする）
          const jp_hour = Number(tm_split[0]) + 9 - 12;
          // '秒 PM' を '秒' だけにする
          const sec = tm_split[2].split(' ')[0];
          // 再構成する
          const time_string = `${jp_hour}時${tm_split[1]}分${sec}秒`;
          pushText = `今日の大阪市北区付近の日の出は${time_string}です！`;
      } catch (error) {
          pushText = '検索中にエラーが発生しました。ごめんね.';
          // APIからエラーが返ってきたらターミナルに表示する
          console.error(error);
      }

      // 「プッシュ」で後からユーザーに通知します
      return client.pushMessage(event.source.userId, {
          type: 'text',
          text: pushText,
      });
  } else if (event.message.text === '日の入り'){
    // 「リプライ」を使って先に返事しておきます
    await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '調べています……'
    });

    let pushText = '';
    try {
        // axiosで日の出日の入り時刻のAPIを叩きます（少し時間がかかる・ブロッキングする）
        const res = await axios.get('https://api.sunrise-sunset.org/json?lat=34.6959484&lng=135.4927352');
        // 取得できるのはUTCなので日本時間（+9時間）になおす
        const utc_time = res.data.results.sunset;
        // '時', '分', '秒 PM' に分割する
        const tm_split = utc_time.split(':');
        // '時' を9時間進めて12時間戻す（13時を過ぎないようにする）
        const jp_hour = Number(tm_split[0]) + 9;
        // '秒 PM' を '秒' だけにする
        const sec = tm_split[2].split(' ')[0];
        // 再構成する
        const time_string = `${jp_hour}時${tm_split[1]}分${sec}秒`;
        pushText = `今日の大阪市北区付近の日の入りは${time_string}です！`;
    } catch (error) {
        pushText = '検索中にエラーが発生しました。ごめんね.';
        // APIからエラーが返ってきたらターミナルに表示する
        console.error(error);
    }

    // 「プッシュ」で後からユーザーに通知します
    return client.pushMessage(event.source.userId, {
        type: 'text',
        text: pushText,
    });
  } else {
      return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '「日の出」または「日の入り」と話しかけてね.'
      });
    }
};


// ########################################
//  LINEサーバーからのWebhookデータを処理する部分
// ########################################

// LINE SDKを初期化します
const client = new line.Client(config);

// LINEサーバーからWebhookがあると「サーバー部分」から以下の "handleEvent" 関数が呼び出される
async function handleEvent(event) {

  // / 受信したWebhookが「テキストメッセージ以外」であればnullを返すことで無視
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  // サンプル関数実行
  return sampleFunction(event);
}


// ########################################
//          Expressによるサーバー部分
// ########################################

// expressを初期化します
const app = express();

//app.get('/', (req, res) => res.send('Hello LINE BOT!(GET)')); //ブラウザ確認用(無くても問題ない)
// HTTP POSTによって '/webhook' のパスにアクセスがあったら、POSTされた内容に応じて様々な処理をします
app.post('/webhook', line.middleware(config), (req, res) => {
    // 通常のメッセージなど … Webhookの中身を確認用にターミナルに表示します
    console.log('受信しました:', req.body.events);
    // 検証ボタンをクリックしたときに飛んできたWebhookを受信したときのみ以下のif文内を実行
    //ここのif分はdeveloper consoleの"接続確認"用なので削除して問題ないです。
    if(req.body.events[0].replyToken === '00000000000000000000000000000000' && req.body.events[1].replyToken === 'ffffffffffffffffffffffffffffffff'){
        res.send('Hello LINE BOT!(POST)'); // LINEサーバーに返答します（なくてもよい）
        console.log('疎通確認用'); // ターミナルに表示します
        return; 
    }

    // あらかじめ宣言しておいた "handleEvent" 関数にWebhookの中身を渡して処理してもらい、
    // 関数から戻ってきたデータをそのままLINEサーバーに「レスポンス」として返します
    Promise.all(req.body.events.map(handleEvent)).then((result) => res.json(result));
});

// 最初に決めたポート番号でサーバーをPC内だけに公開します
// （環境によってはローカルネットワーク内にも公開されます）
 app.listen(PORT);
 console.log(`Server running at ${PORT}`);
//(process.env.NOW_REGION) ? module.exports = app : app.listen(PORT);
//console.log(`Server running at ${PORT}`);