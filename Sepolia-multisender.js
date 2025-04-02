import fs from "fs"
import path from "path"
import readline from "readline-sync"
import gradient from "gradient-string"
import chalkAnimation from "chalk-animation"
import { ethers } from "ethers"
import dotenv from "dotenv"

dotenv.config()

function getRandomColor() {
  const brightColors = [
    "#FF5555",
    "#FF79C6",
    "#BD93F9",
    "#FFB86C",
    "#F1FA8C",
    "#50FA7B",
    "#8BE9FD",
    "#FF92DF",
    "#FF6E6E",
    "#00FFFF",
    "#FF00FF",
    "#FFFF00",
    "#00FF00",
    "#FF3131",
    "#FF7F00",
    "#7FFFD4",
    "#FF6347",
    "#FFA500",
    "#FFD700",
    "#ADFF2F",
    "#00FF7F",
    "#00FFFF",
    "#1E90FF",
    "#FF1493",
    "#FF00FF",
  ]

  return brightColors[Math.floor(Math.random() * brightColors.length)]
}

function createRandomGradient() {
  return gradient([getRandomColor(), getRandomColor(), getRandomColor()])
}

const gradients = {
  purpleToBlue: gradient([getRandomColor(), getRandomColor()]),
  redToYellow: gradient([getRandomColor(), getRandomColor()]),
  blueToGreen: gradient([getRandomColor(), getRandomColor()]),
  rainbowGradient: gradient([
    getRandomColor(),
    getRandomColor(),
    getRandomColor(),
    getRandomColor(),
    getRandomColor(),
    getRandomColor(),
  ]),
  purpleToPink: gradient([getRandomColor(), getRandomColor()]),
  blueToCyan: gradient([getRandomColor(), getRandomColor()]),
  redToOrange: gradient([getRandomColor(), getRandomColor()]),
  greenToYellow: gradient([getRandomColor(), getRandomColor()]),
  orangeToPurple: gradient([getRandomColor(), getRandomColor()]),
  cyanToGreen: gradient([getRandomColor(), getRandomColor()]),
  pinkToBlue: gradient([getRandomColor(), getRandomColor()]),
  yellowToRed: gradient([getRandomColor(), getRandomColor()]),
  magentaToCyan: gradient([getRandomColor(), getRandomColor()]),
  goldToSilver: gradient([getRandomColor(), getRandomColor()]),
  tealToLime: gradient([getRandomColor(), getRandomColor()]),
  pinkToOrange: gradient([getRandomColor(), getRandomColor()]),
  blueToViolet: gradient([getRandomColor(), getRandomColor()]),
  greenToCyan: gradient([getRandomColor(), getRandomColor()]),
  redToPurple: gradient([getRandomColor(), getRandomColor()]),
  menuGradient: gradient([getRandomColor(), getRandomColor(), getRandomColor()]),
  headerGradient: gradient([getRandomColor(), getRandomColor(), getRandomColor()]),
  footerGradient: gradient([getRandomColor(), getRandomColor(), getRandomColor()]),
  titleGradient: gradient([getRandomColor(), getRandomColor(), getRandomColor()]),
  optionGradient: gradient([getRandomColor(), getRandomColor()]),
  warningGradient: gradient(["#FF0000", "#FF8800"]),
  successGradient: gradient(["#00FF00", "#00FFFF"]),
  infoGradient: gradient([getRandomColor(), getRandomColor()]),
}

function getRandomGradient() {
  const gradientKeys = Object.keys(gradients)
  const randomKey = gradientKeys[Math.floor(Math.random() * gradientKeys.length)]
  return gradients[randomKey]
}

function refreshGradients() {
  const brightColors = [
    "#FF5555",
    "#FF79C6",
    "#BD93F9",
    "#FFB86C",
    "#F1FA8C",
    "#50FA7B",
    "#8BE9FD",
    "#FF92DF",
    "#FF6E6E",
    "#00FFFF",
    "#FF00FF",
    "#FFFF00",
    "#00FF00",
    "#FF3131",
    "#FF7F00",
    "#7FFFD4",
    "#FF6347",
    "#FFA500",
    "#FFD700",
    "#ADFF2F",
    "#00FF7F",
    "#00FFFF",
    "#1E90FF",
    "#FF1493",
    "#FF00FF",
  ]

  const shuffledColors = [...brightColors].sort(() => Math.random() - 0.5)

  Object.keys(gradients).forEach((key, index) => {
    const startColor = shuffledColors[index % shuffledColors.length]
    const endColor = shuffledColors[(index + 1) % shuffledColors.length]
    const midColor = shuffledColors[(index + 2) % shuffledColors.length]
    gradients[key] = gradient([startColor, midColor, endColor])
  })
}

refreshGradients()

const RPC_URLS = process.env.RPC_URLS ? process.env.RPC_URLS.split(",") : [process.env.RPC_URL]
let currentRpcIndex = 0

const usedNonces = new Set()
const pendingTransactions = new Map()
const MAX_PENDING_TIME = 180

let telegramNotificationDelay = 5

const asciiArt = `
                              /T /I          
                             / |/ | .-~/    
                         T\\ Y  I  |/  /  _  
        /T               | \\I  |  I  Y.-~/  
       I l   /I       T\\ |  |  l  |  T  /   
__  | \\l   \\l  \\I l __l  l   \\   \`  _. |    
\\ ~-l  \`\\   \`\\  \\  \\\\ ~\\  \\   \`. .-~   |    
 \\   ~-. "-.  \`  \\  ^._ ^. "-.  /  \\   |    
.--~-._  ~-  \`  _  ~-_.-"-." ._ /._ ." ./    
>--.  ~-.   ._  ~>-"    "\\\\   7   7   ]     
^.___~"--._    ~-{  .-~ .  \`\\ Y . /    |     
<__ ~"-.  ~       /_/   \\   \\I  Y   : |
  ^-.__           ~(_/   \\   >._:   | l______     
      ^--.,___.-~"  /_/   !  \`-.~"--l_ /     ~"-.  
             (_/ .  ~(   /'     "~"--,Y   -=b-. _) 
              (_/ .  \\  :           / l      c"~o \\
               \\ /    \`.    .     .^   \\_.-~"~--.  ) 
                (_/ .   \`  /     /       !       )/  
                 / / _.   '.   .':      /        ' 
                 ~(_/ .   /    _  \`  .-<_      -EDO
                   /_/ . ' .-~" \`.  / \\  \\          ,z=.
                   ~( /   '  :   | K   "-.~-.______//
                     "-,.    l   I/ \\_    __{--->._(==.
                      //(     \\  <    ~"~"     //
                     /' /\\     \\  \\     ,v=.  ((
                   .^. / /\\     "  }__ //===-  \`
                  / / ' '  "-.,__ {---(==-
                .^ '       :  T  ~"   ll
               / .  .  . : | :!        \\\\ 
              (_/  /   | | j-"          ~^
                ~-<_(_.^-~"
`

async function displayAsciiArt() {
  const animation = chalkAnimation.rainbow(asciiArt)
  return new Promise((resolve) => {
    setTimeout(() => {
      animation.stop()
      resolve()
    }, 2000)
  })
}

function logError(context, error, additionalInfo = {}) {
  const timestamp = new Date().toISOString()
  console.log(gradients.warningGradient(`❌ Error in ${context}: ${error.message}`))
}

function getNextProvider() {
  try {
    const url = RPC_URLS[currentRpcIndex]
    currentRpcIndex = (currentRpcIndex + 1) % RPC_URLS.length
    return new ethers.JsonRpcProvider(url)
  } catch (error) {
    logError("Provider Setup", error)
    throw new Error("Failed to initialize provider")
  }
}

let provider = getNextProvider()

const privateKeys = process.env.PRIVATE_KEYS ? process.env.PRIVATE_KEYS.split(",") : []
if (privateKeys.length === 0) {
  console.log(gradients.warningGradient("❌ PRIVATE_KEYS tidak ditemukan di .env!"))
  process.exit(1)
}

const wallets = privateKeys.map((key) => new ethers.Wallet(key, provider))

const tokens = {
  BTC: process.env.BTC_CONTRACT,
  MTN: process.env.MTN_CONTRACT,
  TGS: process.env.TGS_CONTRACT,
  TEA: "native",
}

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]

function escapeMarkdownV2(text) {
  if (text === undefined || text === null) {
    return ""
  }
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")
}

async function sendTelegramMessage(txInfo) {
  try {
    await new Promise((resolve) => setTimeout(resolve, telegramNotificationDelay * 1000))

    if (typeof txInfo === "string") {
      const escapedText = txInfo.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&")

      const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
      const body = JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: escapedText,
        parse_mode: "MarkdownV2",
        disable_web_page_preview: true,
      })

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })

      const result = await response.json()
      if (!response.ok || !result.ok) {
        throw new Error(result.description || "Unknown Telegram error")
      }
      console.log(getRandomGradient()("📩 Notifikasi Telegram ") + getRandomGradient()("berhasil dikirim!"))
      return
    }

    if (!txInfo || typeof txInfo !== "object") {
      console.log(gradients.warningGradient("❌ Error: Invalid txInfo data for Telegram notification"))
      return
    }

    const timestamp = new Date()
    const formattedDate = timestamp.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    })

    const formattedBalance = Number(txInfo.remainingBalance || 0).toFixed(4)

    const escapedTxHash = escapeMarkdownV2(txInfo.txHash)
    const escapedSepoliaUrl = "https\\:\\/\\/sepolia\\.tea\\.xyz\\/tx\\/" + escapedTxHash
    const escapedTwitterUrl = "https\\:\\/\\/twitter\\.com\\/edosetiawan\\_eth"

    const message = `🚀 *TRANSAKSI BERHASIL*  
 
👛 *Wallet:* \`${escapeMarkdownV2(txInfo.wallet)}\`  
📤 *Dikirim:* \`${escapeMarkdownV2(txInfo.amount)} ${escapeMarkdownV2(txInfo.token)}\`  
🎯 *Penerima:* \`${escapeMarkdownV2(txInfo.recipient)}\`  
🔗 [Lihat di Sepolia Tea](${escapedSepoliaUrl})  

⛽ *Gas Usage:*  
• Max Priority Fee: \`${escapeMarkdownV2(txInfo.gasPrice)}\`  
• *Biaya Gas:* \`${escapeMarkdownV2(txInfo.gasUsed)}\`  

💰 *Sisa Saldo:* \`${escapeMarkdownV2(formattedBalance)} TEA\`  
⚠️ *Jaringan:* ${txInfo.networkCongestion > 1 ? "*Padat*" : "*Normal*"}  
⏰ *Waktu:* \`${escapeMarkdownV2(formattedDate)}\`  

🔄 *Transaksi \\#${escapeMarkdownV2(txInfo.currentIndex)} dari ${escapeMarkdownV2(txInfo.totalTx)}* \\| 🌐 *Sepolia Tea Testnet*
 
✨ *Powered by* [edosetiawan\\.eth](${escapedTwitterUrl}) ✨`

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
    const body = JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    })

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })

    const result = await response.json()

    if (!response.ok || !result.ok) {
      console.log("Error response from Telegram:", result)
      throw new Error(result.description || "Unknown Telegram error")
    }
    console.log(getRandomGradient()("📩 Notifikasi Telegram ") + getRandomGradient()("berhasil dikirim!"))
  } catch (error) {
    logError("Telegram Notification", error)
    console.log(getRandomGradient()(`⚠️ Notifikasi Telegram gagal dikirim: ${error.message}`))
    console.log(getRandomGradient()("⚠️ Transaksi tetap diproses meskipun notifikasi gagal."))
  }
}

async function sendTelegramCSV(csvData, filename) {
  try {
    const tempFilePath = `./${filename}`
    fs.writeFileSync(tempFilePath, csvData)

    const formData = new URLSearchParams()
    formData.append("chat_id", process.env.TELEGRAM_CHAT_ID)
    formData.append("caption", `📊 Laporan Transaksi ${new Date().toLocaleString("id-ID")}`)

    const fileBuffer = fs.readFileSync(tempFilePath)

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`

    const boundary = "----WebKitFormBoundary" + Math.random().toString(16).substr(2)

    let body = ""

    body += `--${boundary}\r
`
    body += `Content-Disposition: form-data; name="chat_id"\r
\r
`
    body += `${process.env.TELEGRAM_CHAT_ID}\r
`

    body += `--${boundary}\r
`
    body += `Content-Disposition: form-data; name="caption"\r
\r
`
    body += `📊 Laporan Transaksi ${new Date().toLocaleString("id-ID")}\r
`

    body += `--${boundary}\r
`
    body += `Content-Disposition: form-data; name="document"; filename="${filename}"\r
`
    body += `Content-Type: text/csv\r
\r
`

    const requestBody = Buffer.concat([
      Buffer.from(body, "utf8"),
      fileBuffer,
      Buffer.from(
        `\r
--${boundary}--\r
`,
        "utf8",
      ),
    ])

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": requestBody.length.toString(),
      },
      body: requestBody,
    })

    const result = await response.json()

    if (!response.ok || !result.ok) {
      throw new Error(result.description || "Unknown Telegram error")
    }

    console.log(getRandomGradient()("📩 File CSV ") + getRandomGradient()("berhasil dikirim ke Telegram!"))

    fs.unlinkSync(tempFilePath)
  } catch (error) {
    logError("Telegram CSV Upload", error)
    console.log(getRandomGradient()(`⚠️ Gagal mengirim file CSV ke Telegram: ${error.message}`))
  }
}

async function getValidNonce(wallet, forceRefresh = false) {
  try {
    const currentNonce = forceRefresh
      ? await provider.getTransactionCount(wallet.address, "pending")
      : await provider.getTransactionCount(wallet.address, "pending")

    let nonce = currentNonce
    while (usedNonces.has(nonce)) {
      nonce++
    }

    return nonce
  } catch (error) {
    logError("Get Valid Nonce", error)
    provider = getNextProvider()
    const newWallet = new ethers.Wallet(wallet.privateKey, provider)
    return await getValidNonce(newWallet, true)
  }
}

async function checkNetworkCongestion() {
  try {
    const feeData = await provider.getFeeData()

    if (feeData.maxFeePerGas) {
      const baseFee = feeData.lastBaseFeePerGas || BigInt(0)
      const priorityFee = feeData.maxPriorityFeePerGas || BigInt(0)

      if (baseFee === BigInt(0)) return { congested: false, level: 0 }

      const ratio = Number((priorityFee * BigInt(100)) / baseFee)

      if (ratio > 50) return { congested: true, level: 3 }
      if (ratio > 30) return { congested: true, level: 2 }
      if (ratio > 15) return { congested: true, level: 1 }
      return { congested: false, level: 0 }
    } else {
      const gasPrice = feeData.gasPrice || BigInt(0)
      const gasPriceGwei = Number(ethers.formatUnits(gasPrice, "gwei"))

      if (gasPriceGwei > 100) return { congested: true, level: 3 }
      if (gasPriceGwei > 50) return { congested: true, level: 2 }
      if (gasPriceGwei > 20) return { congested: true, level: 1 }
      return { congested: false, level: 0 }
    }
  } catch (error) {
    logError("Check Network Congestion", error)
    return { congested: false, level: 0 }
  }
}

async function calculateGasParameters(increasePercentage = 0) {
  try {
    const feeData = await provider.getFeeData()
    const congestion = await checkNetworkCongestion()

    let totalIncrease = increasePercentage
    if (congestion.congested) {
      const congestionIncrease = [10, 20, 40][congestion.level - 1] || 0
      totalIncrease += congestionIncrease
      console.log(
        getRandomGradient()(`⚠️ Jaringan padat (level ${congestion.level}), menambah gas +${congestionIncrease}%`),
      )
    }

    const multiplier = 1 + totalIncrease / 100

    if (feeData.maxFeePerGas) {
      const maxPriorityFeePerGas = BigInt(Math.floor(Number(feeData.maxPriorityFeePerGas) * multiplier))
      const maxFeePerGas = feeData.lastBaseFeePerGas
        ? BigInt(Math.floor(Number(feeData.lastBaseFeePerGas) * 2)) + maxPriorityFeePerGas
        : BigInt(Math.floor(Number(feeData.maxFeePerGas) * multiplier))

      return {
        type: 2,
        maxPriorityFeePerGas,
        maxFeePerGas,
        supportsEIP1559: true,
      }
    } else {
      return {
        type: 0,
        gasPrice: BigInt(Math.floor(Number(feeData.gasPrice) * multiplier)),
        supportsEIP1559: false,
      }
    }
  } catch (error) {
    logError("Calculate Gas Parameters", error)
    provider = getNextProvider()
    return calculateGasParameters(increasePercentage)
  }
}

async function checkStuckTransactions(wallet) {
  const now = Date.now()
  const stuckTxs = []

  for (const [txHash, txInfo] of pendingTransactions.entries()) {
    if (now - txInfo.timestamp > MAX_PENDING_TIME * 1000) {
      try {
        const tx = await provider.getTransaction(txHash)

        if (tx && !tx.blockNumber) {
          stuckTxs.push({
            hash: txHash,
            nonce: txInfo.nonce,
            recipient: txInfo.recipient,
          })
        } else {
          pendingTransactions.delete(txHash)
        }
      } catch (error) {
        logError(`Check Tx ${txHash}`, error)
      }
    }
  }

  if (stuckTxs.length > 0) {
    console.log(getRandomGradient()(`⚠️ Ditemukan ${stuckTxs.length} transaksi stuck, mencoba cancel...`))

    for (const stuckTx of stuckTxs) {
      await cancelStuckTransaction(wallet, stuckTx)
    }
  }

  return stuckTxs.length > 0
}

async function cancelStuckTransaction(wallet, stuckTx) {
  try {
    console.log(getRandomGradient()(`⏳ Membatalkan transaksi stuck: ${stuckTx.hash} (nonce: ${stuckTx.nonce})`))

    const gasParams = await calculateGasParameters(50)

    const tx = {
      to: wallet.address,
      value: 0n,
      nonce: stuckTx.nonce,
      ...(gasParams.supportsEIP1559
        ? {
            type: 2,
            maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas,
            maxFeePerGas: gasParams.maxFeePerGas,
          }
        : {
            gasPrice: gasParams.gasPrice,
          }),
      gasLimit: 21000,
    }

    const response = await wallet.sendTransaction(tx)
    console.log(getRandomGradient()(`✅ Transaksi cancel dikirim: ${response.hash}`))

    const receipt = await response.wait()

    if (receipt && receipt.status === 1) {
      console.log(getRandomGradient()(`✅ Transaksi dengan nonce ${stuckTx.nonce} berhasil dibatalkan!`))
      pendingTransactions.delete(stuckTx.hash)

      const message =
        `🚫 Transaksi Stuck Dibatalkan
` +
        `👛 Wallet: ${wallet.address}
` +
        `🔢 Nonce: ${stuckTx.nonce}
` +
        `🏷️ Transaksi asli: ${stuckTx.hash}
` +
        `✅ Transaksi pembatalan: ${response.hash}
` +
        `⏰ Waktu: ${new Date().toLocaleString()}`

      await sendTelegramMessage(message)
      return true
    }

    return false
  } catch (error) {
    logError("Cancel Stuck Transaction", error)
    return false
  }
}

async function estimateGasLimit(tokenContract, recipient, amountInWei) {
  try {
    const gasEstimate = await tokenContract.transfer.estimateGas(recipient, amountInWei)
    return BigInt(Math.floor(Number(gasEstimate) * 1.2))
  } catch (error) {
    logError("Estimate Gas", error)
    return 100000n
  }
}

async function sendTransactionWithRetry(
  wallet,
  tokenAddress,
  recipient,
  amount,
  tokenSymbol,
  currentIndex,
  totalTx,
  suggestedNonce = null,
  maxRetries = 5,
) {
  let retries = 0
  const baseDelay = 1000
  let nonce = suggestedNonce !== null ? suggestedNonce : await getValidNonce(wallet)
  let lastError = null

  await checkStuckTransactions(wallet)

  const gasIncreasePercentages = [0, 10, 20, 30, 40]

  while (retries < maxRetries) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ["function transfer(address to, uint256 value) public returns (bool)"],
        wallet,
      )
      const amountInWei = ethers.parseUnits(amount.toString(), 18)

      try {
        await provider.getNetwork()
      } catch (networkError) {
        logError("Network Check", networkError, { attempt: retries + 1 })
        provider = getNextProvider()
        wallet = new ethers.Wallet(wallet.privateKey, provider)
        throw new Error("Network check failed, switching provider")
      }

      console.log(getRandomGradient()(`🚀 Mengirim ${amount} ${tokenSymbol} ke ${recipient}`))
      console.log(
        getRandomGradient()("• felicia ") +
          getRandomGradient()(`(${currentIndex + 1}/${totalTx}) `) +
          getRandomGradient()("edosetiawan.eth"),
      )

      if (usedNonces.has(nonce)) {
        console.log(
          getRandomGradient()(`⚠️ Nonce ${nonce} sudah digunakan dalam session ini, mendapatkan nonce baru...`),
        )
        nonce = await getValidNonce(wallet, true)
        console.log(getRandomGradient()(`🔢 Nonce baru: ${nonce}`))
      }

      usedNonces.add(nonce)

      const increasePercentage = gasIncreasePercentages[Math.min(retries, gasIncreasePercentages.length - 1)]
      const gasParams = await calculateGasParameters(increasePercentage)

      const gasLimit = await estimateGasLimit(tokenContract, recipient, amountInWei)

      if (gasParams.supportsEIP1559) {
        console.log(
          getRandomGradient()(
            `⛽ EIP-1559: maxPriorityFee: ${ethers.formatUnits(gasParams.maxPriorityFeePerGas, "gwei")} Gwei, ` +
              `maxFee: ${ethers.formatUnits(gasParams.maxFeePerGas, "gwei")} Gwei ` +
              `(${increasePercentage > 0 ? `+${increasePercentage}%` : "normal"})`,
          ),
        )
      } else {
        console.log(
          getRandomGradient()(
            `⛽ Gas Price: ${ethers.formatUnits(gasParams.gasPrice, "gwei")} Gwei ` +
              `(${increasePercentage > 0 ? `+${increasePercentage}%` : "normal"})`,
          ),
        )
      }

      console.log(getRandomGradient()(`🔢 Menggunakan nonce: ${nonce}, Gas Limit: ${gasLimit}`))

      const txOptions = {
        nonce,
        gasLimit,
        ...(gasParams.supportsEIP1559
          ? {
              type: 2,
              maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas,
              maxFeePerGas: gasParams.maxFeePerGas,
            }
          : {
              gasPrice: gasParams.gasPrice,
            }),
      }

      const tx = await tokenContract.transfer(recipient, amountInWei, txOptions)

      console.log(createRandomGradient()(`✅ Transaksi dikirim: ${tx.hash}`))

      pendingTransactions.set(tx.hash, {
        timestamp: Date.now(),
        nonce,
        recipient,
      })

      const estimatedTime = await estimateTransactionTime(
        gasParams.supportsEIP1559 ? gasParams.maxFeePerGas : gasParams.gasPrice,
      )

      const gasPriceValue = gasParams.supportsEIP1559
        ? ethers.formatUnits(gasParams.maxPriorityFeePerGas, "gwei")
        : ethers.formatUnits(gasParams.gasPrice, "gwei")

      const gasUsedValue = ethers.formatUnits(
        gasParams.supportsEIP1559
          ? BigInt(gasLimit) * gasParams.maxFeePerGas
          : BigInt(gasLimit) * (gasParams.gasPrice || BigInt(1)),
        "ether",
      )

      const teaBalance = await checkTeaBalance(wallet.address)
      const networkCongestion = (await checkNetworkCongestion()).level

      await sendTelegramMessage({
        wallet: wallet.address,
        amount: amount.toString(),
        token: tokenSymbol,
        recipient: recipient,
        txHash: tx.hash,
        gasPrice: gasPriceValue,
        gasUsed: gasUsedValue,
        remainingBalance: teaBalance,
        networkCongestion: networkCongestion,
        currentIndex: (currentIndex + 1).toString(),
        totalTx: totalTx.toString(),
      })

      pendingTransactions.delete(tx.hash)

      return "SUKSES"
    } catch (err) {
      lastError = err
      logError("Transaction", err)

      if (err.message.includes("insufficient funds")) {
        console.log(getRandomGradient()("❌ Dana tidak mencukupi! Membatalkan transaksi."))
        usedNonces.delete(nonce)
        return "GAGAL"
      }

      if (
        err.message.includes("nonce too low") ||
        err.message.includes("already known") ||
        err.message.includes("replacement transaction underpriced") ||
        err.message.includes("nonce has already been used")
      ) {
        console.log(getRandomGradient()("⚠️ Nonce conflict detected. Getting new nonce..."))
        usedNonces.delete(nonce)
        nonce = await getValidNonce(wallet, true)
        console.log(getRandomGradient()(`🔢 Nonce baru: ${nonce}`))
      } else if (
        err.message.includes("gas price too low") ||
        err.message.includes("max fee per gas less than block base fee") ||
        err.message.includes("transaction underpriced") ||
        err.message.includes("fee cap less than block base fee")
      ) {
        console.log(getRandomGradient()("⚠️ Gas price terlalu rendah. Meningkatkan gas price..."))
      } else {
        usedNonces.delete(nonce)
      }

      retries++
      if (retries < maxRetries) {
        const waitTime = Math.min(baseDelay * Math.pow(2, retries), 30000)
        console.log(
          getRandomGradient()(
            `⏳ Menunggu ${waitTime / 1000} detik sebelum mencoba lagi (Percobaan ${retries + 1}/${maxRetries})...`,
          ),
        )
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  console.log(getRandomGradient()(`❌ Gagal setelah ${maxRetries} percobaan: ${lastError?.message || "Unknown error"}`))
  usedNonces.delete(nonce)
  return "GAGAL"
}

function processCSVFile(filePath) {
  try {
    let data = fs.readFileSync(filePath, "utf8").trim().split("\n")

    if (data.length > 0 && data[0].toLowerCase().includes("quantity")) {
      console.log(getRandomGradient()("⚠️ Melewati baris pertama karena berisi header"))
      data = data.slice(1)
    }

    console.log(getRandomGradient()("\n╔══════════════════════════════════╗"))
    console.log(getRandomGradient()("║        OPSI JUMLAH KOIN          ║"))
    console.log(getRandomGradient()("╚══════════════════════════════════╝\n"))

    console.log(getRandomGradient()("[1] Gunakan nilai dari file CSV (jika ada)"))
    console.log(getRandomGradient()("[2] Atur jumlah manual (sama untuk semua address)"))
    console.log(getRandomGradient()("[3] Otomatis acak (kustom)"))
    console.log(getRandomGradient()("[0] Kembali"))

    while (true) {
      const input = readline.question(getRandomGradient()("\n➤ Pilih opsi (0-3): "))
      const choice = Number.parseInt(input)

      if (input.trim() === "0") {
        console.log(getRandomGradient()("⬅️ Kembali ke menu sebelumnya."))
        return null
      }

      if (!isNaN(choice) && choice >= 1 && choice <= 3) {
        const processedData = []

        if (choice === 1) {
          for (const row of data) {
            const parts = row.split(",").map((part) => part.trim())
            const address = parts[0]

            if (!ethers.isAddress(address)) {
              continue
            }

            let quantity = parts[1]
            if (!quantity || isNaN(Number(quantity))) {
              console.log(getRandomGradient()(`⚠️ Quantity tidak ditemukan untuk ${address}, meminta input manual...`))
              while (true) {
                const qInput = readline.question(getRandomGradient()(`Masukkan jumlah untuk ${address}: `))
                const qValue = Number(qInput)
                if (!isNaN(qValue) && qValue > 0) {
                  quantity = qValue
                  break
                }
                console.log(getRandomGradient()("❌ Jumlah harus berupa angka positif!"))
              }
            }

            processedData.push(`${address},${quantity}`)
          }

          console.log(
            getRandomGradient()(`✅ Menggunakan nilai dari file CSV dengan ${processedData.length} transaksi`),
          )
        } else if (choice === 2) {
          let manualQuantity
          while (true) {
            const qInput = readline.question(getRandomGradient()("Masukkan jumlah koin (untuk semua address): "))
            const qValue = Number(qInput)
            if (!isNaN(qValue) && qValue > 0) {
              manualQuantity = qValue
              break
            }
            console.log(getRandomGradient()("❌ Jumlah harus berupa angka positif!"))
          }

          for (const row of data) {
            const parts = row.split(",").map((part) => part.trim())
            const address = parts[0]

            if (!ethers.isAddress(address)) {
              continue
            }

            processedData.push(`${address},${manualQuantity}`)
          }

          console.log(
            getRandomGradient()(
              `✅ Menggunakan nilai manual ${manualQuantity} untuk ${processedData.length} transaksi`,
            ),
          )
        } else if (choice === 3) {
          let minValue, maxValue

          while (true) {
            const minInput = readline.question(getRandomGradient()("Masukkan nilai minimum: "))
            minValue = Number(minInput)
            if (!isNaN(minValue) && minValue > 0) break
            console.log(getRandomGradient()("❌ Nilai minimum harus berupa angka positif!"))
          }

          while (true) {
            const maxInput = readline.question(getRandomGradient()("Masukkan nilai maksimum: "))
            maxValue = Number(maxInput)
            if (!isNaN(maxValue) && maxValue > minValue) break
            console.log(getRandomGradient()(`❌ Nilai maksimum harus berupa angka lebih besar dari ${minValue}!`))
          }

          for (const row of data) {
            const parts = row.split(",").map((part) => part.trim())
            const address = parts[0]

            if (!ethers.isAddress(address)) {
              continue
            }

            const randomAmount = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
            processedData.push(`${address},${randomAmount}`)
          }

          console.log(
            getRandomGradient()(
              `✅ Menggunakan nilai acak (${minValue}-${maxValue}) untuk ${processedData.length} transaksi`,
            ),
          )
        }

        return processedData
      }

      console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
    }
  } catch (error) {
    logError("Process CSV File", error)
    console.log(getRandomGradient()(`❌ Error saat memproses file CSV: ${error.message}`))
    return null
  }
}

function inputManualAddresses() {
  try {
    console.log(getRandomGradient()("\n╔══════════════════════════════════╗"))
    console.log(getRandomGradient()("║      INPUT MANUAL ADDRESS        ║"))
    console.log(getRandomGradient()("╚══════════════════════════════════╝\n"))

    console.log(getRandomGradient()("Masukkan alamat wallet satu per satu. Ketik 'selesai' untuk mengakhiri input."))

    const addresses = []
    let addressCount = 1

    while (true) {
      const input = readline.question(getRandomGradient()(`Alamat #${addressCount}: `))

      if (input.toLowerCase() === "selesai") {
        break
      }

      if (ethers.isAddress(input)) {
        addresses.push(input)
        addressCount++
      } else {
        console.log(getRandomGradient()(`❌ Alamat tidak valid: ${input}! Silakan coba lagi.`))
      }
    }

    if (addresses.length === 0) {
      console.log(getRandomGradient()("❌ Tidak ada alamat yang diinput!"))
      return null
    }

    console.log(getRandomGradient()("\n╔══════════════════════════════════╗"))
    console.log(getRandomGradient()("║      OPSI JUMLAH KOIN            ║"))
    console.log(getRandomGradient()("╚══════════════════════════════════╝\n"))

    console.log(getRandomGradient()("[1] Atur jumlah manual (sama untuk semua address)"))
    console.log(getRandomGradient()("[2] Atur jumlah berbeda untuk setiap address"))
    console.log(getRandomGradient()("[3] Otomatis acak (kustom)"))
    console.log(getRandomGradient()("[0] Kembali"))

    while (true) {
      const input = readline.question(getRandomGradient()("\n➤ Pilih opsi (0-3): "))
      const choice = Number.parseInt(input)

      if (input.trim() === "0") {
        console.log(getRandomGradient()("⬅️ Kembali ke menu sebelumnya."))
        return null
      }

      if (!isNaN(choice) && choice >= 1 && choice <= 3) {
        const processedData = []

        if (choice === 1) {
          let manualQuantity
          while (true) {
            const qInput = readline.question(getRandomGradient()("Masukkan jumlah koin (untuk semua address): "))
            const qValue = Number(qInput)
            if (!isNaN(qValue) && qValue > 0) {
              manualQuantity = qValue
              break
            }
            console.log(getRandomGradient()("❌ Jumlah harus berupa angka positif!"))
          }

          for (const address of addresses) {
            processedData.push(`${address},${manualQuantity}`)
          }

          console.log(
            getRandomGradient()(
              `✅ Menggunakan nilai manual ${manualQuantity} untuk ${processedData.length} transaksi`,
            ),
          )
        } else if (choice === 2) {
          for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i]
            let quantity

            while (true) {
              const qInput = readline.question(getRandomGradient()(`Masukkan jumlah untuk ${address}: `))
              const qValue = Number(qInput)
              if (!isNaN(qValue) && qValue > 0) {
                quantity = qValue
                break
              }
              console.log(getRandomGradient()("❌ Jumlah harus berupa angka positif!"))
            }

            processedData.push(`${address},${quantity}`)
          }

          console.log(
            getRandomGradient()(`✅ Menggunakan nilai manual berbeda untuk ${processedData.length} transaksi`),
          )
        } else if (choice === 3) {
          let minValue, maxValue

          while (true) {
            const minInput = readline.question(getRandomGradient()("Masukkan nilai minimum: "))
            minValue = Number(minInput)
            if (!isNaN(minValue) && minValue > 0) break
            console.log(getRandomGradient()("❌ Nilai minimum harus berupa angka positif!"))
          }

          while (true) {
            const maxInput = readline.question(getRandomGradient()("Masukkan nilai maksimum: "))
            maxValue = Number(maxInput)
            if (!isNaN(maxValue) && maxValue > minValue) break
            console.log(getRandomGradient()(`❌ Nilai maksimum harus berupa angka lebih besar dari ${minValue}!`))
          }

          for (const address of addresses) {
            const randomAmount = Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
            processedData.push(`${address},${randomAmount}`)
          }

          console.log(
            getRandomGradient()(
              `✅ Menggunakan nilai acak (${minValue}-${maxValue}) untuk ${processedData.length} transaksi`,
            ),
          )
        }

        // Simpan ke CSV
        console.log(getRandomGradient()("\n╔══════════════════════════════════╗"))
        console.log(getRandomGradient()("║      SIMPAN KE FILE CSV          ║"))
        console.log(getRandomGradient()("╚══════════════════════════════════╝\n"))

        const fileName = readline.question(getRandomGradient()("Masukkan nama file (tanpa ekstensi .csv): "))
        const csvFileName = fileName.trim() ? `${fileName.trim()}.csv` : `felicia_manual_${Date.now()}.csv`

        const csvContent = "address,quantity\n" + processedData.map((row) => row).join("\n")

        fs.writeFileSync(csvFileName, csvContent)
        console.log(getRandomGradient()(`✅ Data berhasil disimpan ke file ${csvFileName}`))

        return processedData
      }

      console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
    }
  } catch (error) {
    logError("Input Manual Addresses", error)
    console.log(getRandomGradient()(`❌ Error saat input manual address: ${error.message}`))
    return null
  }
}

function selectCSVFile() {
  try {
    const files = fs
      .readdirSync(".")
      .filter((file) => file.endsWith(".csv"))
      .sort((a, b) => {
        const numA = Number.parseInt(a.match(/\d+/)?.[0] || "0")
        const numB = Number.parseInt(b.match(/\d+/)?.[0] || "0")
        return numA - numB
      })

    if (files.length === 0) {
      console.log(getRandomGradient()("⚠️ Tidak ada file CSV yang ditemukan!"))
      console.log(getRandomGradient()("Anda dapat menggunakan opsi input manual address."))
    }

    console.log(getRandomGradient()("\n╔══════════════════════════════════╗"))
    console.log(getRandomGradient()("║      PILIH FILE CSV              ║"))
    console.log(getRandomGradient()("╚══════════════════════════════════╝\n"))

    files.forEach((file, index) => {
      console.log(getRandomGradient()(`[${index + 1}] ${file}`))
    })

    console.log(getRandomGradient()(`[${files.length + 1}] Input manual address`))
    console.log(getRandomGradient()("[0] Kembali"))

    while (true) {
      const input = readline.question(getRandomGradient()("\n➤ Pilih opsi (0-" + (files.length + 1) + "): "))
      const choice = Number.parseInt(input)

      if (input.trim() === "0") {
        console.log(getRandomGradient()("⬅️ Kembali ke menu sebelumnya."))
        return null
      }

      if (!isNaN(choice) && choice > 0 && choice <= files.length) {
        return files[choice - 1]
      } else if (choice === files.length + 1) {
        return "manual_input"
      }

      console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
    }
  } catch (error) {
    logError("File Selection", error)
    console.log(getRandomGradient()("❌ Terjadi kesalahan saat memilih file!"))
    return null
  }
}

function chooseRetryCount() {
  while (true) {
    const input = readline.question(getRandomGradient()("Masukkan jumlah retry jika gagal (1-10): "))

    if (input.trim() === "0") {
      console.log(getRandomGradient()("❌ Operasi dibatalkan."))
      return null
    }

    const count = Number.parseInt(input)
    if (!isNaN(count) && count >= 1 && count <= 10) {
      return count
    }
    console.log(getRandomGradient()("❌ Jumlah retry harus antara 1-10!"))
  }
}

function chooseTransactionDelay() {
  console.log(getRandomGradient()("\n╔══════════════════════════════════╗"))
  console.log(getRandomGradient()("║      MODE JEDA                   ║"))
  console.log(getRandomGradient()("╚══════════════════════════════════╝\n"))

  console.log(getRandomGradient()("[1] Tanpa Jeda"))
  console.log(getRandomGradient()("[2] Jeda Manual"))
  console.log(getRandomGradient()("[3] Jeda Acak"))
  console.log(getRandomGradient()("[0] Kembali"))

  while (true) {
    const input = readline.question(getRandomGradient()("\n➤ Pilih mode jeda (0-3): "))
    const choice = Number.parseInt(input)

    if (input.trim() === "0") {
      console.log(getRandomGradient()("⬅️ Kembali ke menu sebelumnya."))
      return null
    }

    if (!isNaN(choice) && choice >= 1 && choice <= 3) {
      return choice - 1
    }

    console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
  }
}

function setManualDelay() {
  while (true) {
    const input = readline.question(getRandomGradient()("Masukkan waktu jeda (0.1 - 1000 detik): "))

    if (input.trim() === "0") {
      console.log(getRandomGradient()("❌ Dibatalkan."))
      return null
    }

    const delay = Number.parseFloat(input)
    if (!isNaN(delay) && delay >= 0.1 && delay <= 1000) {
      return delay
    }
    console.log(getRandomGradient()("❌ Waktu jeda harus antara 0.1 - 1000 detik!"))
  }
}

function setRandomDelayRange() {
  while (true) {
    const minInput = readline.question(getRandomGradient()("Masukkan waktu minimum jeda (0.1 - 1000 detik): "))

    if (minInput.trim() === "0") {
      console.log(getRandomGradient()("❌ Dibatalkan."))
      return null
    }

    const maxInput = readline.question(getRandomGradient()("Masukkan waktu maksimum jeda (0.1 - 1000 detik): "))

    if (maxInput.trim() === "0") {
      console.log(getRandomGradient()("❌ Dibatalkan."))
      return null
    }

    const min = Number.parseFloat(minInput)
    const max = Number.parseFloat(maxInput)

    if (!isNaN(min) && !isNaN(max) && min >= 0.1 && max <= 1000 && min < max) {
      return { min, max }
    }
    console.log(getRandomGradient()("❌ Range jeda tidak valid! Min harus >= 0.1, Max <= 1000, dan Min < Max"))
  }
}

function getRandomDelay(min, max) {
  return Math.random() * (max - min) + min
}

function chooseBatchSize() {
  while (true) {
    const input = readline.question(getRandomGradient()("Masukkan jumlah transaksi per batch (1-1000): "))

    if (input.trim() === "0") {
      console.log(getRandomGradient()("❌ Dibatalkan."))
      return null
    }

    const batchSize = Number.parseInt(input)
    if (!isNaN(batchSize) && batchSize >= 1 && batchSize <= 1000000) {
      return batchSize
    }
    console.log(getRandomGradient()("❌ Jumlah transaksi per batch harus antara 1 dan 1000000!"))
  }
}

async function applyDelay(delayChoice, delayTime, randomDelayRange, currentIndex, totalTx) {
  if (currentIndex >= totalTx - 1) return

  try {
    if (delayChoice === 0) {
      return
    } else if (delayChoice === 1) {
      console.log(getRandomGradient()(`⏳ Menunggu ${delayTime} detik...`))
      await new Promise((resolve) => setTimeout(resolve, delayTime * 1000))
    } else if (delayChoice === 2) {
      const randomDelay = getRandomDelay(randomDelayRange.min, randomDelayRange.max)
      console.log(getRandomGradient()(`⏳ Jeda acak: ${randomDelay.toFixed(1)} detik`))
      await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000))
    }
  } catch (error) {
    logError("Delay Application", error)
  }
}

function setTelegramDelay() {
  while (true) {
    const input = readline.question(getRandomGradient()("Masukkan delay notifikasi Telegram (dalam detik, 0-600): "))

    if (input.trim() === "0") {
      telegramNotificationDelay = 0
      return
    }

    const delay = Number.parseInt(input)
    if (!isNaN(delay) && delay >= 0 && delay <= 600) {
      telegramNotificationDelay = delay
      return
    }
    console.log(getRandomGradient()("❌ Delay harus antara 0-600 detik!"))
  }
}

function saveCheckpoint(index) {
  fs.writeFileSync("checkpoint.txt", index.toString())
}

function loadCheckpoint() {
  if (fs.existsSync("checkpoint.txt")) {
    const checkpoint = fs.readFileSync("checkpoint.txt", "utf8").trim()
    return Number.parseInt(checkpoint)
  }
  return 0
}

async function checkTeaBalance(address) {
  try {
    const balance = await provider.getBalance(address)
    return ethers.formatEther(balance)
  } catch (error) {
    logError("Check TEA Balance", error)
    return "Error"
  }
}

async function checkTokenBalance(tokenAddress, walletAddress) {
  try {
    if (tokenAddress === "native") {
      const balance = await provider.getBalance(walletAddress)
      return {
        balance: ethers.formatEther(balance),
        symbol: "TEA",
        decimals: 18,
      }
    }

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    const [balance, decimals, symbol] = await Promise.all([
      tokenContract.balanceOf(walletAddress),
      tokenContract.decimals(),
      tokenContract.symbol(),
    ])

    return {
      balance: ethers.formatUnits(balance, decimals),
      symbol,
      decimals,
    }
  } catch (error) {
    logError("Check Token Balance", error)
    return {
      balance: "Error",
      symbol: "Unknown",
      decimals: 18,
    }
  }
}

async function estimateTransactionTime(gasPrice) {
  const baseTime = 15
  const gasPriceGwei = Number.parseFloat(ethers.formatUnits(gasPrice, "gwei"))
  const estimatedTime = baseTime * (10 / gasPriceGwei)

  if (estimatedTime < 60) {
    return `${Math.round(estimatedTime)} detik`
  } else if (estimatedTime < 3600) {
    return `${Math.round(estimatedTime / 60)} menit`
  } else if (estimatedTime < 86400) {
    return `${Math.round(estimatedTime / 3600)} jam`
  } else {
    return `${Math.round(estimatedTime / 86400)} hari`
  }
}

function calculateTotalEstimatedTime(totalTx, delayChoice, delayTime, randomDelayRange, batchSize) {
  let totalTime = 0
  const baseTransactionTime = 15

  if (delayChoice === 0) {
    totalTime = (totalTx / batchSize) * baseTransactionTime
  } else if (delayChoice === 1) {
    totalTime = totalTx * (baseTransactionTime + delayTime)
  } else if (delayChoice === 2) {
    const avgDelay = (randomDelayRange.min + randomDelayRange.max) / 2
    totalTime = totalTx * (baseTransactionTime + avgDelay)
  }

  if (totalTime < 60) {
    return `${Math.round(totalTime)} detik`
  } else if (totalTime < 3600) {
    return `${Math.round(totalTime / 60)} menit`
  } else if (totalTime < 86400) {
    return `${Math.round(totalTime / 3600)} jam`
  } else {
    return `${Math.round(totalTime / 86400)} hari`
  }
}

async function cancelNonce() {
  console.clear()

  // Display ASCII art with animation
  await displayAsciiArt()

  try {
    console.log(gradients.rainbowGradient("\n╔═══════════════════════════════════════╗"))
    console.log(gradients.rainbowGradient("║   CANCEL NONCE - SEPOLIA TEA TESTNET  ║"))
    console.log(gradients.rainbowGradient("╚═══════════════════════════════════════╝"))
    console.log(getRandomGradient()("\n╔═══════════════════════════════════════════╗"))
    console.log(getRandomGradient()("║        AUTHOR : edosetiawan.eth           ║"))
    console.log(getRandomGradient()("║        E-MAIL : edosetiawan.eth@gmail.com ║"))
    console.log(getRandomGradient()("║     INSTAGRAM : @edosetiawan.eth          ║"))
    console.log(getRandomGradient()("║     TWITTER/X : @edosetiawan_eth          ║"))
    console.log(getRandomGradient()("║        GITHUB : edosetiawan-xyz           ║"))
    console.log(getRandomGradient()("║       DISCORD : edosetiawan.eth           ║"))
    console.log(getRandomGradient()("╚═══════════════════════════════════════════╝\n"))

    console.log(gradients.rainbowGradient("╔══════════════════════════╗"))
    console.log(gradients.rainbowGradient("║      PILIH WALLET        ║"))
    console.log(gradients.rainbowGradient("╚══════════════════════════╝\n"))

    wallets.forEach((wallet, index) => {
      console.log(getRandomGradient()(`[${index + 1}] ${wallet.address}`))
    })
    console.log(getRandomGradient()("[0] Kembali"))

    let selectedWallet = null
    while (true) {
      const input = readline.question(getRandomGradient()("\n➤ Pilih wallet (0-" + wallets.length + "): "))
      const choice = Number.parseInt(input)

      if (input.trim() === "0") {
        console.log(getRandomGradient()("⬅️ Kembali ke menu sebelumnya."))
        return
      }

      if (!isNaN(choice) && choice > 0 && choice <= wallets.length) {
        selectedWallet = wallets[choice - 1]
        break
      }

      console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
    }

    const currentNonce = await provider.getTransactionCount(selectedWallet.address, "latest")
    const pendingNonce = await provider.getTransactionCount(selectedWallet.address, "pending")

    console.log(getRandomGradient()(`\n💼 Wallet: ${selectedWallet.address}`))
    console.log(getRandomGradient()(`🔢 Nonce saat ini: ${currentNonce}`))
    console.log(getRandomGradient()(`🔢 Nonce pending: ${pendingNonce}`))

    if (pendingNonce <= currentNonce) {
      console.log(getRandomGradient()("\n✅ Tidak ada transaksi pending untuk dibatalkan!"))
      readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
      return
    }

    console.log(getRandomGradient()(`\n⚠️ Terdapat ${pendingNonce - currentNonce} transaksi pending`))

    console.log(gradients.rainbowGradient("\n╔══════════════════════════╗"))
    console.log(gradients.rainbowGradient("║      PILIH NONCE         ║"))
    console.log(gradients.rainbowGradient("╚══════════════════════════╝\n"))

    console.log(getRandomGradient()("[1] Batalkan semua nonce pending"))
    console.log(getRandomGradient()("[2] Batalkan nonce tertentu"))
    console.log(getRandomGradient()("[0] Kembali"))

    const noncesToCancel = []
    while (true) {
      const input = readline.question(getRandomGradient()("\n➤ Pilih opsi (0-2): "))
      const choice = Number.parseInt(input)

      if (input.trim() === "0") {
        console.log(getRandomGradient()("⬅️ Kembali ke menu sebelumnya."))
        return
      }

      if (choice === 1) {
        for (let i = currentNonce; i < pendingNonce; i++) {
          noncesToCancel.push(i)
        }
        break
      } else if (choice === 2) {
        const nonceInput = readline.question(
          getRandomGradient()(`Masukkan nonce yang ingin dibatalkan (${currentNonce}-${pendingNonce - 1}): `),
        )
        const nonce = Number.parseInt(nonceInput)

        if (!isNaN(nonce) && nonce >= currentNonce && nonce < pendingNonce) {
          noncesToCancel.push(nonce)
          break
        }

        console.log(getRandomGradient()("❌ Nonce tidak valid! Silakan coba lagi."))
        continue
      }

      console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
    }

    console.log(
      getRandomGradient()(`\n⚠️ Akan membatalkan ${noncesToCancel.length} nonce: ${noncesToCancel.join(", ")}`),
    )
    const confirm = readline.question(getRandomGradient()("Lanjutkan? (y/n): "))

    if (confirm.toLowerCase() !== "y") {
      console.log(getRandomGradient()("❌ Operasi dibatalkan oleh user."))
      readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
      return
    }

    const gasParams = await calculateGasParameters(50)

    console.log(
      getRandomGradient()(
        `\n🚀 Membatalkan transaksi dengan ${
          gasParams.supportsEIP1559
            ? `maxPriorityFee: ${ethers.formatUnits(gasParams.maxPriorityFeePerGas, "gwei")} Gwei, maxFee: ${ethers.formatUnits(gasParams.maxFeePerGas, "gwei")} Gwei`
            : `Gas Price: ${ethers.formatUnits(gasParams.gasPrice, "gwei")} Gwei`
        }...`,
      ),
    )

    let successCount = 0
    let failCount = 0

    for (const nonce of noncesToCancel) {
      try {
        console.log(getRandomGradient()(`\n⏳ Membatalkan nonce ${nonce}...`))

        const tx = {
          to: selectedWallet.address,
          value: 0n,
          nonce: nonce,
          ...(gasParams.supportsEIP1559
            ? {
                type: 2,
                maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas,
                maxFeePerGas: gasParams.maxFeePerGas,
              }
            : {
                gasPrice: gasParams.gasPrice,
              }),
          gasLimit: 21000,
        }

        const response = await selectedWallet.sendTransaction(tx)
        console.log(createRandomGradient()(`✅ Transaksi pembatalan dikirim: ${response.hash}`))

        console.log(getRandomGradient()(`⏳ Menunggu konfirmasi...`))
        const receipt = await response.wait()

        if (receipt && receipt.status === 1) {
          console.log(getRandomGradient()(`✅ Transaksi dengan nonce ${nonce} berhasil dibatalkan!`))
          successCount++

          const message =
            `🚫 Nonce ${nonce} Dibatalkan\n` +
            `👛 Wallet: ${selectedWallet.address}\n` +
            `✅ Transaksi pembatalan: ${response.hash}\n` +
            `⛽ ${
              gasParams.supportsEIP1559
                ? `Max Priority Fee: ${ethers.formatUnits(gasParams.maxPriorityFeePerGas, "gwei")} Gwei, Max Fee: ${ethers.formatUnits(gasParams.maxFeePerGas, "gwei")} Gwei`
                : `Gas Price: ${ethers.formatUnits(gasParams.gasPrice, "gwei")} Gwei`
            }\n` +
            `⏰ Waktu: ${new Date().toLocaleString()}`

          await sendTelegramMessage(message)
        } else {
          console.log(getRandomGradient()(`❌ Pembatalan nonce ${nonce} gagal!`))
          failCount++
        }
      } catch (error) {
        console.log(getRandomGradient()(`❌ Error saat membatalkan nonce ${nonce}: ${error.message}`))

        if (error.message.includes("nonce has already been used")) {
          console.log(getRandomGradient()(`✅ Nonce ${nonce} sudah digunakan oleh transaksi lain.`))
          successCount++
        } else {
          failCount++
        }
      }
    }

    console.log(getRandomGradient()("\n✅ Proses pembatalan nonce selesai!"))
    console.log(getRandomGradient()(`✅ Berhasil: ${successCount}`))
    if (failCount > 0) {
      console.log(getRandomGradient()(`❌ Gagal: ${failCount}`))
    }

    const summaryMessage =
      `📊 Ringkasan Pembatalan Nonce\n` +
      `👛 Wallet: ${selectedWallet.address}\n` +
      `✅ Berhasil: ${successCount}\n` +
      `❌ Gagal: ${failCount}\n` +
      `⏰ Waktu: ${new Date().toLocaleString()}`

    await sendTelegramMessage(summaryMessage)

    readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
  } catch (error) {
    logError("Cancel Nonce", error)
    console.error(getRandomGradient()(`❌ Error: ${error.message}`))
    readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
  }
}

async function checkTokenBalances() {
  console.clear()

  // Display ASCII art with animation
  await displayAsciiArt()

  try {
    console.log(gradients.rainbowGradient("\n╔══════════════════════════════════════╗"))
    console.log(gradients.rainbowGradient("║    CEK SALDO - SEPOLIA TEA TESTNET   ║"))
    console.log(gradients.rainbowGradient("╚══════════════════════════════════════╝"))
    console.log(getRandomGradient()("\n╔═══════════════════════════════════════════╗"))
    console.log(getRandomGradient()("║        AUTHOR : edosetiawan.eth           ║"))
    console.log(getRandomGradient()("║        E-MAIL : edosetiawan.eth@gmail.com ║"))
    console.log(getRandomGradient()("║     INSTAGRAM : @edosetiawan.eth          ║"))
    console.log(getRandomGradient()("║     TWITTER/X : @edosetiawan_eth          ║"))
    console.log(getRandomGradient()("║        GITHUB : edosetiawan-xyz           ║"))
    console.log(getRandomGradient()("║       DISCORD : edosetiawan.eth           ║"))
    console.log(getRandomGradient()("╚═══════════════════════════════════════════╝\n"))

    console.log(gradients.rainbowGradient("╔══════════════════════════╗"))
    console.log(gradients.rainbowGradient("║      PILIH WALLET        ║"))
    console.log(gradients.rainbowGradient("╚══════════════════════════╝\n"))

    wallets.forEach((wallet, index) => {
      console.log(getRandomGradient()(`[${index + 1}] ${wallet.address}`))
    })
    console.log(getRandomGradient()("[0] Kembali"))

    let selectedWallet = null
    while (true) {
      const input = readline.question(getRandomGradient()("\n➤ Pilih wallet (0-" + wallets.length + "): "))
      const choice = Number.parseInt(input)

      if (input.trim() === "0") {
        console.log(getRandomGradient()("⬅️ Kembali ke menu sebelumnya."))
        return
      }

      if (!isNaN(choice) && choice > 0 && choice <= wallets.length) {
        selectedWallet = wallets[choice - 1]
        break
      }

      console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
    }

    console.log(gradients.rainbowGradient("\n╔══════════════════════════╗"))
    console.log(gradients.rainbowGradient("║      PILIH TOKEN         ║"))
    console.log(gradients.rainbowGradient("╚══════════════════════════╝\n"))

    console.log(getRandomGradient()("[1] TEA (Native Token)"))
    console.log(getRandomGradient()("[2] BTC (Assam BTC)"))
    console.log(getRandomGradient()("[3] MTN (MeowTea Token)"))
    console.log(getRandomGradient()("[4] TGS (TeaDogs INU)"))
    console.log(getRandomGradient()("[5] Cek Semua Token"))
    console.log(getRandomGradient()("[0] Kembali"))

    while (true) {
      const input = readline.question(getRandomGradient()("\n➤ Pilih token (0-5): "))
      const choice = Number.parseInt(input)

      if (input.trim() === "0") {
        console.log(getRandomGradient()("⬅️ Kembali ke menu sebelumnya."))
        return
      }

      if (!isNaN(choice) && choice >= 1 && choice <= 5) {
        console.log(getRandomGradient()("\n⏳ Memeriksa saldo..."))

        if (choice === 5) {
          console.log(getRandomGradient()("\n╔══════════════════════════════════════╗"))
          console.log(getRandomGradient()("║          SALDO SEMUA TOKEN           ║"))
          console.log(getRandomGradient()("╚══════════════════════════════════════╝\n"))

          console.log(getRandomGradient()(`👛 Wallet: ${selectedWallet.address}\n`))

          const teaResult = await checkTokenBalance("native", selectedWallet.address)
          console.log(getRandomGradient()(`💰 TEA: ${teaResult.balance} ${teaResult.symbol}`))

          const btcResult = await checkTokenBalance(tokens.BTC, selectedWallet.address)
          console.log(getRandomGradient()(`💰 BTC: ${btcResult.balance} ${btcResult.symbol}`))

          const mtnResult = await checkTokenBalance(tokens.MTN, selectedWallet.address)
          console.log(getRandomGradient()(`💰 MTN: ${mtnResult.balance} ${mtnResult.symbol}`))

          const tgsResult = await checkTokenBalance(tokens.TGS, selectedWallet.address)
          console.log(getRandomGradient()(`💰 TGS: ${tgsResult.balance} ${tgsResult.symbol}`))

          const message =
            `💰 Saldo Token\n` +
            `👛 Wallet: ${selectedWallet.address}\n` +
            `\n` +
            `TEA: ${teaResult.balance} ${teaResult.symbol}\n` +
            `BTC: ${btcResult.balance} ${btcResult.symbol}\n` +
            `MTN: ${mtnResult.balance} ${mtnResult.symbol}\n` +
            `TGS: ${tgsResult.balance} ${tgsResult.symbol}\n` +
            `\n` +
            `⏰ Waktu: ${new Date().toLocaleString()}`

          await sendTelegramMessage(message)
        } else {
          const tokenSymbols = ["TEA", "BTC", "MTN", "TGS"]
          const tokenAddresses = ["native", tokens.BTC, tokens.MTN, tokens.TGS]

          const selectedTokenSymbol = tokenSymbols[choice - 1]
          const selectedTokenAddress = tokenAddresses[choice - 1]

          console.log(getRandomGradient()(`\n╔══════════════════════════════════════╗`))
          console.log(getRandomGradient()(`║          SALDO ${selectedTokenSymbol.padEnd(20, " ")}║`))
          console.log(getRandomGradient()(`╚══════════════════════════════════════╝\n`))

          console.log(getRandomGradient()(`👛 Wallet: ${selectedWallet.address}\n`))

          const result = await checkTokenBalance(selectedTokenAddress, selectedWallet.address)
          console.log(getRandomGradient()(`💰 ${selectedTokenSymbol}: ${result.balance} ${result.symbol}`))

          const message =
            `💰 Saldo ${selectedTokenSymbol}\n` +
            `👛 Wallet: ${selectedWallet.address}\n` +
            `\n` +
            `${selectedTokenSymbol}: ${result.balance} ${result.symbol}\n` +
            `\n` +
            `⏰ Waktu: ${new Date().toLocaleString()}`

          await sendTelegramMessage(message)
        }

        readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
        return
      }

      console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
    }
  } catch (error) {
    logError("Check Token Balances", error)
    console.error(getRandomGradient()(`❌ Error: ${error.message}`))
    readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
  }
}

async function processTokenTransfer(tokenSymbol, tokenAddress) {
  try {
    // Pilih file CSV
    const fileOption = selectCSVFile()
    if (fileOption === null) {
      return
    }

    let processedData

    if (fileOption === "manual_input") {
      processedData = inputManualAddresses()

      if (!processedData) {
        return
      }

      console.log(getRandomGradient()(`📊 Total transaksi: ${processedData.length}`))
    } else {
      console.log(getRandomGradient()(`📂 File yang dipilih: ${fileOption}`))

      const filePath = path.resolve(fileOption)
      if (!fs.existsSync(filePath)) {
        throw new Error("File tidak ditemukan!")
      }

      processedData = processCSVFile(filePath)

      if (!processedData) {
        return
      }

      console.log(getRandomGradient()(`📊 Total transaksi: ${processedData.length}`))
    }

    const wallet = wallets[0]

    // Tampilkan saldo semua token
    const teaBalance = await checkTeaBalance(wallet.address)
    console.log(getRandomGradient()(`💰 Saldo $TEA: ${teaBalance} TEA`))

    const btcResult = await checkTokenBalance(tokens.BTC, wallet.address)
    console.log(getRandomGradient()(`💰 Saldo $BTC: ${btcResult.balance} ${btcResult.symbol}`))

    const mtnResult = await checkTokenBalance(tokens.MTN, wallet.address)
    console.log(getRandomGradient()(`💰 Saldo $MTN: ${mtnResult.balance} ${mtnResult.symbol}`))

    const tdiResult = await checkTokenBalance(tokens.TGS, wallet.address)
    console.log(getRandomGradient()(`💰 Saldo $TGS: ${tdiResult.balance} ${tdiResult.symbol}`))

    // Cek informasi jaringan
    const feeData = await provider.getFeeData()
    const supportsEIP1559 = !!feeData.maxFeePerGas
    console.log(getRandomGradient()(`🔧 Jaringan ${supportsEIP1559 ? "mendukung" : "tidak mendukung"} EIP-1559`))

    if (supportsEIP1559) {
      console.log(
        getRandomGradient()(
          `⛽ Base Fee: ${ethers.formatUnits(feeData.lastBaseFeePerGas || 0n, "gwei")} Gwei, ` +
            `Priority Fee: ${ethers.formatUnits(feeData.maxPriorityFeePerGas || 0n, "gwei")} Gwei`,
        ),
      )
    } else {
      console.log(getRandomGradient()(`⛽ Gas Price saat ini: ${ethers.formatUnits(feeData.gasPrice, "gwei")} Gwei`))
    }

    const congestion = await checkNetworkCongestion()
    if (congestion.congested) {
      console.log(
        getRandomGradient()(
          `⚠️ Jaringan sedang padat (level ${congestion.level}), transaksi mungkin membutuhkan gas lebih tinggi`,
        ),
      )
    }

    // Pilih jumlah retry
    const retryCount = chooseRetryCount()
    if (retryCount === null) {
      return
    }

    // Pilih mode jeda
    const delayChoice = chooseTransactionDelay()
    if (delayChoice === null) {
      return
    }

    let delayTime = 0
    let randomDelayRange = { min: 0, max: 0 }
    let batchSize = 1

    if (delayChoice === 0) {
      console.log(getRandomGradient()("Transaksi akan dilakukan tanpa jeda."))
      console.log(
        getRandomGradient()("⚠️ Direkomendasikan 1-100 batch pertransaksi. Jika melewati itu akan terjadi error."),
      )
      batchSize = chooseBatchSize()
      if (batchSize === null) {
        return
      }
      console.log(getRandomGradient()(`Batch size: ${batchSize} transaksi per batch`))
    } else if (delayChoice === 1) {
      delayTime = setManualDelay()
      if (delayTime === null) {
        return
      }
      console.log(getRandomGradient()(`ℹ️ Mode: Jeda Manual ${delayTime} detik`))
    } else if (delayChoice === 2) {
      randomDelayRange = setRandomDelayRange()
      if (randomDelayRange === null) {
        return
      }
      console.log(getRandomGradient()(`ℹ️ Mode: Jeda Acak ${randomDelayRange.min}-${randomDelayRange.max} detik`))
    }

    // Estimasi waktu total
    const totalEstimatedTime = calculateTotalEstimatedTime(
      processedData.length,
      delayChoice,
      delayTime,
      randomDelayRange,
      batchSize,
    )
    console.log(getRandomGradient()(`⏱️ Estimasi waktu total: ${totalEstimatedTime}`))

    // Set delay notifikasi Telegram
    setTelegramDelay()

    // Konfirmasi sebelum memulai transaksi
    const confirm = readline.question(getRandomGradient()("\nApakah Anda yakin ingin memulai transaksi? (y/n): "))
    if (confirm.toLowerCase() !== "y") {
      console.log(getRandomGradient()("❌ Operasi dibatalkan oleh user."))
      return
    }

    let successCount = 0
    let failCount = 0
    let reportData = "address,quantity,status\n"

    const totalTx = processedData.length

    // Memuat checkpoint
    const checkpoint = loadCheckpoint()

    // Dapatkan nonce awal
    let nonce = await getValidNonce(wallet, true)
    console.log(getRandomGradient()(`🔢 Nonce awal: ${nonce}`))

    // Inisialisasi daftar transaksi yang berhasil dan gagal untuk session ini
    const sessionSuccessful = new Set()
    const sessionFailed = new Set()

    for (let i = checkpoint; i < totalTx; i += batchSize) {
      const batch = processedData.slice(i, i + batchSize)
      const promises = batch.map(async (row, index) => {
        const [address, amount] = row.split(",").map((x) => x.trim())

        if (!ethers.isAddress(address)) {
          reportData += `${address},${amount},invalid_address\n`
          return
        }

        if (sessionSuccessful.has(address)) {
          console.log(getRandomGradient()(`⚠️ Transaksi ke ${address} sudah sukses dalam session ini. Dilewati.`))
          return
        }
        if (sessionFailed.has(address)) {
          console.log(getRandomGradient()(`⚠️ Transaksi ke ${address} sudah gagal dalam session ini. Dilewati.`))
          return
        }

        const txNonce = nonce + index

        await checkStuckTransactions(wallet)

        const result = await sendTransactionWithRetry(
          wallet,
          tokenAddress,
          address,
          amount,
          tokenSymbol,
          i + index,
          totalTx,
          txNonce,
          retryCount,
        )

        if (result === "SUKSES") {
          successCount++
          sessionSuccessful.add(address)
          reportData += `${address},${amount},sukses\n`
        } else {
          failCount++
          sessionFailed.add(address)
          reportData += `${address},${amount},gagal\n`
        }
      })

      await Promise.all(promises)
      nonce += batch.length

      if (i + batchSize < totalTx) {
        nonce = await getValidNonce(wallet, true)
        console.log(getRandomGradient()(`🔢 Nonce terbaru: ${nonce}`))
      }

      saveCheckpoint(i + batchSize)
      console.log(
        getRandomGradient()(
          `🚀 Progress: ${Math.min(i + batchSize, totalTx)}/${totalTx} (${Math.round(
            (Math.min(i + batchSize, totalTx) / totalTx) * 100,
          )}%)`,
        ),
      )

      if (i < totalTx - batchSize && delayChoice !== 0) {
        await applyDelay(delayChoice, delayTime, randomDelayRange, i, totalTx)
      }

      if ((i + 1) % 10 === 0) {
        const updatedTeaBalance = await checkTeaBalance(wallet.address)
        console.log(getRandomGradient()(`💰 Saldo $TEA terbaru: ${updatedTeaBalance} TEA`))
      }

      if ((i + 1) % 5 === 0) {
        const feeData = await provider.getFeeData()
        if (feeData.maxFeePerGas) {
          console.log(
            getRandomGradient()(
              `⛽ Base Fee: ${ethers.formatUnits(feeData.lastBaseFeePerGas || 0n, "gwei")} Gwei, ` +
                `Priority Fee: ${ethers.formatUnits(feeData.maxPriorityFeePerGas || 0n, "gwei")} Gwei`,
            ),
          )
        } else {
          console.log(
            getRandomGradient()(`⛽ Gas Price saat ini: ${ethers.formatUnits(feeData.gasPrice, "gwei")} Gwei`),
          )
        }

        const congestion = await checkNetworkCongestion()
        if (congestion.congested) {
          console.log(
            getRandomGradient()(
              `⚠️ Jaringan sedang padat (level ${congestion.level}), transaksi mungkin membutuhkan gas lebih tinggi`,
            ),
          )
        }
      }
    }

    console.log(getRandomGradient()("\n✅ Semua transaksi selesai!\n"))

    const finalReport = `✅ Laporan Transaksi:
Sukses: ${successCount}
Gagal: ${failCount}`
    await sendTelegramMessage(finalReport)
    console.log(getRandomGradient()(finalReport))

    fs.writeFileSync("report.csv", reportData)
    console.log(getRandomGradient()("📊 Laporan telah disimpan dalam file report.csv"))

    try {
      const filename = `transaksi_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`
      await sendTelegramCSV(reportData, filename)
    } catch (error) {
      console.log(getRandomGradient()(`⚠️ Gagal mengirim file CSV ke Telegram: ${error.message}`))
    }

    readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
  } catch (error) {
    logError("Process Token Transfer", error)
    console.error(getRandomGradient()(`❌ Error: ${error.message}`))
    readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
  }
}

async function main() {
  while (true) {
    console.clear()

    // Display ASCII art with animation
    await displayAsciiArt()

    try {
      // Refresh gradients on each menu display for random colors
      refreshGradients()

      console.log(gradients.rainbowGradient("\n╔══════════════════════════════════════╗"))
      console.log(gradients.rainbowGradient("║   MULTISENDER - SEPOLIA TEA TESTNET  ║"))
      console.log(gradients.rainbowGradient("╚══════════════════════════════════════╝"))
      console.log(getRandomGradient()("\n╔═══════════════════════════════════════════╗"))
      console.log(getRandomGradient()("║        AUTHOR : edosetiawan.eth           ║"))
      console.log(getRandomGradient()("║        E-MAIL : edosetiawan.eth@gmail.com ║"))
      console.log(getRandomGradient()("║     INSTAGRAM : @edosetiawan.eth          ║"))
      console.log(getRandomGradient()("║     TWITTER/X : @edosetiawan_eth          ║"))
      console.log(getRandomGradient()("║        GITHUB : edosetiawan-xyz           ║"))
      console.log(getRandomGradient()("║       DISCORD : edosetiawan.eth           ║"))
      console.log(getRandomGradient()("╚═══════════════════════════════════════════╝\n"))

      console.log(gradients.rainbowGradient("╔══════════════════════════════════════╗"))
      console.log(gradients.rainbowGradient("║                 MENU                 ║"))
      console.log(gradients.rainbowGradient("╠══════════════════════════════════════╣"))
      console.log(getRandomGradient()("║ [1] Bitcoin - BTC                    ║"))
      console.log(getRandomGradient()("║ [2] MeowTea Token - MTN              ║"))
      console.log(getRandomGradient()("║ [3] TeaDogs INU - TGS                ║"))
      console.log(getRandomGradient()("║ [4] Kirim Token Manual               ║"))
      console.log(getRandomGradient()("║ [5] Cancel Nonce                     ║"))
      console.log(getRandomGradient()("║ [6] Cek Saldo Token                  ║"))
      console.log(getRandomGradient()("║ [0] Keluar                           ║"))
      console.log(gradients.rainbowGradient("╚══════════════════════════════════════╝\n"))

      const input = readline.question(getRandomGradient()("\n➤ Pilih opsi (0-6): "))
      const choice = Number.parseInt(input)

      if (input.trim() === "0") {
        console.log(getRandomGradient()("⬅️ Keluar dari program."))
        process.exit(0)
      }

      let tokenSymbol, tokenAddress

      if (choice === 6) {
        await checkTokenBalances()
      } else if (choice === 5) {
        await cancelNonce()
      } else if (choice === 4) {
        tokenAddress = readline.question(getRandomGradient()("Masukkan alamat smart contract token: "))
        tokenSymbol = readline.question(getRandomGradient()("Masukkan simbol token: "))
        await processTokenTransfer(tokenSymbol, tokenAddress)
      } else if (choice >= 1 && choice <= 3) {
        const tokenOptions = ["BTC", "MTN", "TGS"]
        tokenSymbol = tokenOptions[choice - 1]
        tokenAddress = tokens[tokenSymbol]
        await processTokenTransfer(tokenSymbol, tokenAddress)
      } else {
        console.log(getRandomGradient()("❌ Pilihan tidak valid! Silakan coba lagi."))
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } catch (error) {
      logError("Main Execution", error)
      console.error(getRandomGradient()(`❌ Error: ${error.message}`))
      readline.question(getRandomGradient()("\nTekan Enter untuk kembali ke menu utama..."))
    }
  }
}

// Display ending message with different gradient colors
function displayEndingMessage() {
  console.log(getRandomGradient()("✨✨✨ Terima kasih telah menggunakan script ini! ✨✨✨"))
  console.log(
    getRandomGradient()(
      "==================================================================================",
    ),
  )
  console.log(getRandomGradient()("        ⚠️  PERINGATAN HAK CIPTA ⚠️        "))
  console.log(
    getRandomGradient()(
      "==================================================================================",
    ),
  )
  console.log(
    getRandomGradient()("DILARANG KERAS ") +
      getRandomGradient()("menyalin, mendistribusikan, atau menggunakan kode dalam script ini tanpa izin dari ") +
      getRandomGradient()("edosetiawan.eth") +
      getRandomGradient()(" Segala bentuk duplikasi tanpa izin akan dianggap sebagai pelanggaran hak cipta"),
  )
  console.log(
    getRandomGradient()(
      "==================================================================================",
    ),
  )
  console.log(getRandomGradient()("        ✅ PENGGUNAAN RESMI ✅        "))
  console.log(
    getRandomGradient()(
      "==================================================================================",
    ),
  )
  console.log(
    getRandomGradient()(
      "Script ini hanya boleh digunakan oleh pemilik resmi yang telah diberikan akses. Jika Anda bukan pengguna resmi, segera hubungi ",
    ) +
      getRandomGradient()("edosetiawan.eth") +
      getRandomGradient()(" untuk validasi."),
  )
}

// Register ending message to be displayed on exit
process.on("exit", displayEndingMessage)

process.on("SIGINT", () => {
  console.log(getRandomGradient()("\n\n⚠️ Program dihentikan oleh user."))
  process.exit(0)
})

main().catch((err) => {
  console.error(getRandomGradient()(`❌ Error: ${err.message}`))
  process.exit(1)
})

