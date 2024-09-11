const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');
const googleTts = require('google-tts-api');
const os = require('os');
const CobaltAPI = require('cobalt-api');

// Menampilkan platform sistem operasi
const osPlatform = os.platform();
console.log("Running on platform: ", osPlatform);

// Remote client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-extensions",
      '--disable-gpu',
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      '--disable-dev-shm-usage'
    ],
  },
  webVersion: '2.3000.1012760672-alpha',
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/html/2.3000.1012760672-alpha.html'
  }
});

// qr
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

// log ready
client.on('ready', () => {
  console.log('Client is ready!');
});

// Initialize Cobalt API
const cobaltAPI = new CobaltAPI();

// Menangani pesan yang masuk
client.on('message_create', async message => {
  // Memeriksa apakah pesan berasal dari chat grup
  if (message.isGroupMsg) {
    return; // Abaikan pesan jika berasal dari grup
  }

  // Proses pesan hanya jika berasal dari chat pribadi
  console.log('Pesan pribadi diterima:', message.body);

  if (message.body === '!help') {
    const helpMessage = `
╔══════════════════════════════════════════╗
|             **Bot Commands**             |
╠══════════════════════════════════════════╣
| !help - Show this help message           |
| !ping - Reply with "pong!"               |
| !stats - Display bot statistics          |
| !ts [text] - Convert text to speech      |
| !stiker [Name] - Send local media        |
| !send [URL] [Name] - Send media          |
| !video - Convert video to sticker        |
| !time - Show current time                |
| !vt [TikTok URL] - Download TikTok video |
╚══════════════════════════════════════════╝
    `;
    message.reply(helpMessage);
  }

  if (message.body === '!ping') {
    message.reply('pong!');
  }

  if (message.body.startsWith('!stiker')) {
    const parts = message.body.split(' ');
    if (parts.length < 2) {
      message.reply('Mohon sertakan nama stiker. Contoh: "!stiker [NamaStiker]"');
      return;
    }

    const stickerName = parts.slice(1).join(' ');

    // Check if the message contains media
    if (message.hasMedia) {
      try {
        // Download the media
        const media = await message.downloadMedia();

        // Create a temporary file to store the media
        const tempFilePath = path.join(__dirname, `./upload/document/${stickerName}.png`);
        fs.writeFileSync(tempFilePath, media.data, 'base64');

        // Sending media as sticker
        await client.sendMessage(message.from, media, {
          sendMediaAsSticker: true,
          stickerName: stickerName,
          stickerAuthor: 'yukina'
        });

        console.log(`Stiker berhasil dibuat dengan nama: ${stickerName}`);
      } catch (error) {
        console.error('Error saat mengirim stiker:', error);
        message.reply('Maaf, terjadi kesalahan saat mengirim stiker.');
      }
    } else {
      message.reply('Mohon balas media yang ingin dijadikan stiker dengan perintah "!stiker [NamaStiker]"');
    }
  }

  if (message.body.startsWith('!send')) {
    const parts = message.body.split(' ');
    if (parts.length < 3) {
      message.reply('Mohon sertakan URL dan nama stiker. Contoh: "!send [URL] [NamaStiker]"');
      return;
    }
    const url = parts[1];
    const stickerName = parts.slice(2).join(' ');
    try {
      const extension = path.extname(new URL(url).pathname);
      if (!['.jpeg', '.jpg', '.png', '.mp4', '.gif'].includes(extension)) {
        message.reply('Format file tidak didukung. Silakan gunakan JPEG, JPG, PNG, MP4, atau GIF.');
        return;
      }
      const fileName = `media-${Date.now()}${extension}`;
      const savePath = path.join(__dirname, `./upload/document/${fileName}`);
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(savePath, buffer);
      console.log(`Media disimpan sebagai ${fileName}`);
      const media = MessageMedia.fromFilePath(savePath);
      await client.sendMessage(message.from, media, {
        sendMediaAsSticker: true,
        stickerName: stickerName,
        stickerAuthor: "yukina"
      });
    } catch (error) {
      console.error('Error mengirim stiker:', error);
      message.reply('Maaf, terjadi kesalahan saat mengirim stiker.');
    }
  }

  if (message.body.startsWith('!video')) {
    if (message.hasMedia) {
      const media = await message.downloadMedia();
      console.log('Media downloaded successfully');
      const videoPath = './upload/video/receivedVideo.mp4';
      fs.writeFileSync(videoPath, media.data, 'base64');
      console.log('Video saved successfully');
      const outputStickerPath = './convertedSticker.webp';
      try {
        const process = new ffmpeg(videoPath);
        process.then(
          function (video) {
            console.log('Video processing started');
            video.setSize('100x100', true);
            video.save(outputStickerPath, function (error, file) {
              if (!error) {
                console.log('Sticker created successfully!');
                client.sendMessage(message.from, fs.readFileSync(outputStickerPath), {
                  sendMediaAsSticker: true,
                  stickerName: 'sticker',
                  stickerAuthor: 'yukina'
                }).then(() => {
                  console.log('Sticker sent successfully');
                }).catch((error) => {
                  console.error('Error sending sticker:', error);
                });
              } else {
                console.error('Error creating sticker:', error);
              }
            });
          },
          function (err) {
            console.error('Error processing video:', err);
          }
        );
      } catch (err) {
        console.error('Error converting video:', err);
      }
    } else {
      message.reply('Tidak ada media video yang ditemukan.');
    }
  }

  if (message.body === '!stats') {
    const statsMessage = `Stats\nTotal commands: 6`;
    message.reply(statsMessage);
  }

  if (message.body === '!time') {
    const currentTime = new Date().toLocaleTimeString();
    message.reply(`Jam sekarang adalah ${currentTime}`);
  }

  if (message.body.startsWith('!ts ')) {
    const textToSpeak = message.body.slice(4);
    if (textToSpeak.length > 0) {
      try {
        const url = googleTts.getAudioUrl(textToSpeak, {
          lang: 'id',
          slow: false,
          host: 'https://translate.google.com',
        });
        const response = await fetch(url);
        const buffer = await response.buffer();
        const ttsMedia = new MessageMedia('audio/mp3', buffer.toString('base64'));
        await client.sendMessage(message.from, ttsMedia, { sendAudioAsVoice: true });
      } catch (error) {
        console.error('Error generating TTS:', error);
        message.reply('Maaf, terjadi kesalahan saat menghasilkan suara.');
      }
    } else {
      message.reply('Silakan masukkan teks yang ingin diubah menjadi suara.');
    }
  }

  if (message.body.startsWith('!vt')) {
    const parts = message.body.split(' ');
    if (parts.length < 2) {
      message.reply('Mohon sertakan URL TikTok. Contoh: "!vt [URL TikTok]"');
      return;
    }

    const tturl = parts[1];
    const checkurl = tturl.startsWith('https://www.tiktok.com/') || tturl.startsWith('https://vt.tiktok.com/');
    if (!checkurl) {
      message.reply('URL TikTok tidak valid. Pastikan URL mulai dengan "https://www.tiktok.com/" atau "https://vt.tiktok.com/"');
      return;
    }

    try {
      message.reply("Downloading your TikTok video....");

      // Inisialisasi CobaltAPI dengan URL TikTok
      const cobalt = new CobaltAPI(tturl);

      // Kirim permintaan untuk mengunduh video
      const response = await cobalt.sendRequest();

      // Periksa struktur respons
      console.log('CobaltAPI Response:', response);

      if (response.status) {
        // Jika respons berisi URL unduhan
        const downloadUrl = response.data.url; // Atau properti lain sesuai struktur respons

        // Pastikan direktori ada
        const downloadDir = path.join(__dirname, 'upload', 'download');
        if (!fs.existsSync(downloadDir)) {
          fs.mkdirSync(downloadDir, { recursive: true });
        }

        // Unduh video dari URL unduhan
        const videoPath = path.join(downloadDir, `tiktok-${Date.now()}.mp4`);
        const videoResponse = await fetch(downloadUrl);
        const arrayBuffer = await videoResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(videoPath, buffer);

        // Kirim video via WhatsApp
        const media = MessageMedia.fromFilePath(videoPath);
        await client.sendMessage(message.from, media);

        console.log('Video TikTok berhasil dikirim');
      } else {
        message.reply('Maaf, tidak dapat menemukan video dari URL yang diberikan.');
      }
    } catch (error) {
      console.error('Error mengunduh video TikTok:', error);
      message.reply('Maaf, terjadi kesalahan saat mengunduh video TikTok.');
    }
  }

});

client.initialize();
