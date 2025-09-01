// ========== SETTINGS ==========
const settings = {
    QR_CODE_URL: "00020101021126670016COM.NOBUBANK.WWW01189360050300000879140214457150968685130303UMI51440014ID.CO.QRIS.WWW0215ID20253689561030303UMI5204541153033605802ID5920TOKO PUTRA OK19605526011PURBALINGGA61055331162070703A016304BF40",
    apiSimpel: "new2025",
    KEYORKUT: "513251117364410601960552OKCT170A13AFB2B1060347DDC646A937C63C",
    MERCHANT_ID: "OK1960552",
    DO_API_TOKEN: "dop_v1_10170b34bbc9af29be8a7a010f653ddc5e31d152843dd8ca623db8c88da9eac5",
    TELEGRAM_BOT_TOKEN: "7309787389:AAFumWul9fPbhV1n3DwRgc6hy0iBvX2VwCM", // Replace with your actual bot token
    TELEGRAM_CHAT_ID: "7320305486" // Replace with your actual chat ID
};

// Debug mode
const DEBUG_MODE = false;

// Global variables
let selectedProduct = null;
let selectedPrice = null;
let selectedRam = null;
let selectedCpu = null;
let selectedDisk = null;
let selectedRegion = null;
let selectedOs = null;
let polling = null;
let startTime = null;
let currentQrUrl = null;
let paymentProcessed = false;

// DOM Elements
const productCards = document.querySelectorAll('.product-card');
const continueBtn = document.getElementById('continueBtn');
const productSection = document.getElementById('productSection');
const paymentSection = document.getElementById('paymentSection');
const processingSection = document.getElementById('processingSection');
const successSection = document.getElementById('successSection');
const loadingOverlay = document.getElementById('loadingOverlay');
const checkStatusBtn = document.getElementById('checkStatusBtn');
const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
const newPurchaseBtn = document.getElementById('newPurchaseBtn');
const status = document.getElementById('status');

// Payment Proof Elements
const sendProofBtn = document.getElementById('sendProofBtn');
const sendProofSection = document.getElementById('sendProofSection');
const proofForm = document.getElementById('proofForm');
const cancelProofBtn = document.getElementById('cancelProofBtn');
const proofSuccessSection = document.getElementById('proofSuccessSection');
const backToPaymentBtn = document.getElementById('backToPaymentBtn');
const proofImage = document.getElementById('proofImage');
const imagePreview = document.getElementById('imagePreview');

// Function that does nothing - replacing debugLog
function debugLog(message) {
    if (DEBUG_MODE) {
        console.log(message);
    }
}

// Show loading overlay
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Select product event
    productCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove 'selected' class from all cards
            productCards.forEach(c => c.classList.remove('selected'));
            
            // Add 'selected' class to the clicked card
            card.classList.add('selected');
            
            // Store the selected product data
            selectedProduct = card.dataset.product;
            selectedPrice = parseInt(card.dataset.price);
            selectedRam = card.dataset.ram;
            selectedCpu = card.dataset.cpu;
            selectedDisk = card.dataset.disk;
            selectedRegion = card.dataset.region;
            selectedOs = card.dataset.os;
            
            // Enable continue button
            continueBtn.disabled = false;
        });
    });
    
    // Continue to payment
    continueBtn.addEventListener('click', () => {
        showLoading();
        setTimeout(() => {
            startPayment();
        }, 800);
    });
    
    // Check status manually
    checkStatusBtn.addEventListener('click', () => {
        // Hide payment section and show processing section
        paymentSection.style.display = 'none';
        processingSection.style.display = 'block';
        
        setTimeout(() => {
            checkStatusNow();
        }, 1500);
    });
    
    // Cancel payment
    cancelPaymentBtn.addEventListener('click', () => {
        showLoading();
        
        setTimeout(() => {
            if (polling) {
                clearInterval(polling);
            }
            productSection.style.display = 'block';
            paymentSection.style.display = 'none';
            processingSection.style.display = 'none';
            status.className = 'status waiting';
            status.innerText = '⏳ Waiting for payment...';
            paymentProcessed = false;
            
            // Reset selected product
            productCards.forEach(c => c.classList.remove('selected'));
            continueBtn.disabled = true;
            selectedProduct = null;
            selectedPrice = null;
            
            hideLoading();
        }, 800);
    });
    
    // New purchase button
    newPurchaseBtn.addEventListener('click', () => {
        showLoading();
        
        setTimeout(() => {
            successSection.style.display = 'none';
            productSection.style.display = 'block';
            productCards.forEach(c => c.classList.remove('selected'));
            continueBtn.disabled = true;
            selectedProduct = null;
            selectedPrice = null;
            paymentProcessed = false;
            
            hideLoading();
        }, 800);
    });
    
    // Payment Proof Feature
    setupProofFeature();
    
    // Load footer
    loadFooter();
});

// Generate random number
function generateRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Correctly format amount for QRIS
function formatAmount(amount) {
    // Format amount to two decimal places and pad with zeros
    return amount.toFixed(2).replace('.', '').padStart(12, '0');
}

// Inject amount to QR string according to QRIS format
function injectAmountToQrString(qrString, amount) {
    // Format the amount according to QRIS standards
    // Add tag 54 (amount) with proper format
    const formattedAmount = formatAmount(amount);
    
    // Check if the QR string already contains tag 54
    if (qrString.includes("54")) {
        // Replace existing tag 54
        return qrString.replace(/54[0-9]{12}/, "54" + formattedAmount);
    } else {
        // Add tag 54 at the end, before the checksum (if any)
        return qrString + "54" + formattedAmount;
    }
}

// Generate random password for VPS
function randomv2() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Start payment process
async function startPayment() {
    if (!selectedProduct || !selectedPrice) {
        alert("Please select a package first.");
        hideLoading();
        return;
    }
    
    try {
        const idPembayaran = generateRandom(1000000000, 9999999999);
        
        const minFee = 100;  // minimal fee
        const maxFee = 500;  // maksimal fee
        const randomFee = Math.floor(Math.random() * (maxFee - minFee + 1)) + minFee;
        const totalAmount = Number(selectedPrice) + randomFee;
        
        // Correctly inject amount into QRIS string
        const qrFinal = injectAmountToQrString(settings.QR_CODE_URL, totalAmount);
        
        // Encode QR for display
        const encodedQR = encodeURIComponent(qrFinal);
        const apiKey = settings.apiSimpel;
        const createUrl = `https://simpelz.fahriofficial.my.id/api/orkut/createpayment?apikey=${apiKey}&amount=${totalAmount}&codeqr=${settings.QR_CODE_URL}`;
        
        let data;
        if (DEBUG_MODE) {
            // Simulate API response
            data = {
                status: true,
                result: {
                    transactionId: "TX" + Date.now(),
                    amount: totalAmount,
                    qrImageUrl: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodedQR
                }
            };
        } else {
            const res = await fetch(createUrl);
            data = await res.json();
        }
        
        if (data.status) {
            currentQrUrl = data.result.qrImageUrl;
            
            // Update payment details
            document.getElementById('selectedProductName').innerText = selectedProduct.charAt(0).toUpperCase() + selectedProduct.slice(1) + " VPS";
            document.getElementById('idPembayaran').innerText = idPembayaran;
            document.getElementById('trxId').innerText = data.result.transactionId;
            document.getElementById('totalAmount').innerText = "Rp" + data.result.amount.toLocaleString('id-ID');
            document.getElementById('qrImageUrl').innerText = data.result.qrImageUrl;
            
            // Set expiration time (10 minutes from now)
            const expirationTime = new Date(Date.now() + 10 * 60 * 1000);
            document.getElementById('expired').innerText = expirationTime.toLocaleTimeString();
            document.getElementById('qrImage').src = data.result.qrImageUrl;
            
            // Show payment section
            productSection.style.display = 'none';
            paymentSection.style.display = 'block';
            
            startTime = Date.now();
            paymentProcessed = false;
            startPolling(data.result.amount, data.result.transactionId);
        } else {
            alert("Failed to create payment: " + (data.message || "Unknown error"));
            productSection.style.display = 'block';
            paymentSection.style.display = 'none';
        }
    } catch (error) {
        console.error("Error creating payment:", error);
        alert("An error occurred while creating payment.");
        productSection.style.display = 'block';
        paymentSection.style.display = 'none';
    } finally {
        hideLoading();
    }
}

// Poll for payment status
function startPolling(targetAmount, transactionId) {
    const apiKey = settings.apiSimpel;
    const keyorkut = settings.KEYORKUT;
    const merchant = settings.MERCHANT_ID;
    
    if (polling) {
        clearInterval(polling);
    }
    
    polling = setInterval(async () => {
        if (paymentProcessed) {
            clearInterval(polling);
            return;
        }
    
        const elapsed = Date.now() - startTime;
        if (elapsed > 600000) { // 10 minutes timeout
            clearInterval(polling);
            status.innerText = "⚠️ QRIS Expired!";
            status.className = "status expired";
            return;
        }
    
        try {
            let data;
            if (DEBUG_MODE) {
                data = { type: "WAITING" };
            } else {
                const res = await fetch(`https://simpelz.fahriofficial.my.id/api/orkut/cekstatus?apikey=${apiKey}&merchant=${merchant}&keyorkut=${keyorkut}&trxid=${transactionId}`);
                data = await res.json();
            }
    
            if (data && data.type === "CR" && Math.abs(Number(data.amount) - Number(targetAmount)) < 0.01) {
                if (!paymentProcessed) {
                    paymentProcessed = true;
                    clearInterval(polling);
    
                    paymentSection.style.display = 'none';
                    processingSection.style.display = 'block';
    
                    setTimeout(() => {
                        createVPS();
                    }, 2000);
                }
            }
        } catch (err) {
            // Silent error
        }
    }, 5000);
}    

// Check status manually
async function checkStatusNow() {
    if (paymentProcessed) {
        return;
    }
    
    const apiKey = settings.apiSimpel;
    const keyorkut = settings.KEYORKUT;
    const merchant = settings.MERCHANT_ID;
    const transactionId = document.getElementById("trxId").innerText;
    const targetAmount = Number(document.getElementById("totalAmount").innerText.replace(/[^0-9]/g, ''));
    
    try {
        let data;
        if (DEBUG_MODE) {
            // For debugging, simulate success
            data = { 
                type: "CR", 
                amount: targetAmount 
            };
        } else {
            const res = await fetch(`https://simpelz.fahriofficial.my.id/api/orkut/cekstatus?apikey=${apiKey}&merchant=${merchant}&keyorkut=${keyorkut}&trxid=${transactionId}`);
            data = await res.json();
        }
        
        // Use approximately equal for floating point safety
        if (data && data.type === "CR" && Math.abs(Number(data.amount) - targetAmount) < 0.01) {
            if (!paymentProcessed) {
                paymentProcessed = true;
                clearInterval(polling);
                
                // Keep processing screen visible
                // Create VPS after a delay
                setTimeout(() => {
                    createVPS();
                }, 1500);
            }
        } else {
            // Return to payment section if not successful
            setTimeout(() => {
                processingSection.style.display = 'none';
                paymentSection.style.display = 'block';
                status.innerText = "❌ Pembayaran Belum Tuntas....";
                setTimeout(() => {
                    status.innerText = "⏳ Waiting for payment...";
                    status.className = "status waiting";
                }, 3000);
            }, 1000);
        }
    } catch (err) {
        // Return to payment section on error
        setTimeout(() => {
            processingSection.style.display = 'none';
            paymentSection.style.display = 'block';
            status.innerText = "❌ Error checking payment status";
            setTimeout(() => {
                status.innerText = "⏳ Waiting for payment...";
                status.className = "status waiting";
            }, 3000);
        }, 1000);
    }
}

// Create VPS
async function createVPS() {
    debugLog("Starting VPS creation process");
    
    try {
        // Determine VPS size based on selected product
        let vpsSize;
        if (selectedRam === "1") {
            vpsSize = "1";
        } else if (selectedRam === "2") {
            vpsSize = "2";
        } else if (selectedRam === "4") {
            vpsSize = "4";
        } else {
            vpsSize = "1"; // Default
        }
        
        const apiToken = settings.DO_API_TOKEN || "dop_v1_10170b34bbc9af29be8a7a010f653ddc5e31d152843dd8ca623db8c88da9eac5";
        
        debugLog(`Creating VPS with size=${vpsSize}`);
        
        // Make the API call to create the VPS
        const createUrl = `https://simpelz.fahriofficial.my.id/api/create-vps?vps=${vpsSize}&apido=${apiToken}`;
        
        const response = await fetch(createUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to create VPS: ${response.statusText}`);
        }
        
        const vpsCreationResponse = await response.json();
        
        debugLog("VPS creation response: " + JSON.stringify(vpsCreationResponse));
        
        if (vpsCreationResponse.status === "processing" && vpsCreationResponse.id) {
            const vpsId = vpsCreationResponse.id;
            const vpsPassword = vpsCreationResponse.password;
            
            debugLog(`VPS creation started with ID: ${vpsId}, now waiting for IP address...`);
            
            // Update UI to show we're waiting for the IP
            status.innerText = "⏳ VPS created, waiting for IP address...";
            status.className = "status pending";
            
            // Wait 20 seconds before checking for the IP as per instructions
            debugLog("Waiting 20 seconds before checking for IP...");
            await new Promise(resolve => setTimeout(resolve, 20000));
            
            // Now check for the IP address
            let ipAddress = null;
            let attempts = 0;
            const maxAttempts = 5; // Try up to 5 times
            
            while (!ipAddress && attempts < maxAttempts) {
                try {
                    // Call the get-vps API endpoint
                    const getVpsUrl = `https://simpelz.fahriofficial.my.id/api/get-vps?id=${vpsId}&apido=${apiToken}`;
                    const getVpsResponse = await fetch(getVpsUrl);
                    
                    if (!getVpsResponse.ok) {
                        throw new Error(`Failed to get VPS details: ${getVpsResponse.statusText}`);
                    }
                    
                    const vpsDetails = await getVpsResponse.json();
                    
                    debugLog("Get VPS response: " + JSON.stringify(vpsDetails));
                    
                    if (vpsDetails.status === "ready" && vpsDetails.ip) {
                        ipAddress = vpsDetails.ip;
                        debugLog(`Got IP address: ${ipAddress}`);
                        break;
                    } else {
                        debugLog("VPS not ready yet, waiting and retrying...");
                        // Wait 10 seconds before checking again
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                } catch (error) {
                    debugLog(`Error getting VPS details: ${error.message}`);
                }
                
                attempts++;
                debugLog(`Waiting for IP address, attempt ${attempts}/${maxAttempts}...`);
            }
            
            if (!ipAddress) {
                throw new Error(`Failed to get IP address for the VPS after ${maxAttempts} attempts`);
            }
            
            // Show success message and set the VPS details
            document.getElementById('vpsId').innerText = vpsId;
            document.getElementById('vpsIp').innerText = ipAddress;
            document.getElementById('vpsPassword').innerText = vpsPassword;
            
            // Hide both payment and processing sections before showing success
            paymentSection.style.display = 'none';
            processingSection.style.display = 'none';
            successSection.style.display = 'block';
            
            // Save successful purchase to local storage
            saveSuccessfulPurchase(vpsId, ipAddress, vpsPassword);
            
            debugLog(`VPS creation completed. ID: ${vpsId}, IP: ${ipAddress}`);
        } else {
            throw new Error(`VPS creation failed: ${vpsCreationResponse.message || "Unknown error"}`);
        }
    } catch (error) {
        debugLog("VPS creation error: " + error);
        status.innerText = "❌ Error creating VPS: " + error.message;
        status.className = "status expired";
        // Add event listener to the error back button
        if (document.getElementById('errorBackBtn')) {
            document.getElementById('errorBackBtn').addEventListener('click', () => {
                processingSection.style.display = 'none';
                productSection.style.display = 'block';
                productCards.forEach(c => c.classList.remove('selected'));
                continueBtn.disabled = true;
                selectedProduct = null;
                selectedPrice = null;
                paymentProcessed = false;
            });
        }
    }
}

// Save successful purchase to localStorage
function saveSuccessfulPurchase(vpsId, ipAddress, password) {
    const purchaseData = {
        vpsId: vpsId,
        ipAddress: ipAddress,
        password: password,
        product: selectedProduct,
        price: selectedPrice,
        date: new Date().toISOString()
    };
    
    localStorage.setItem('paymentSuccess', 'true');
    localStorage.setItem('orderData', JSON.stringify(purchaseData));
}

// Check if there's a saved purchase on page load
function checkForSavedPurchase() {
    const isSuccess = localStorage.getItem('paymentSuccess');
    if (isSuccess === 'true') {
        try {
            const orderData = JSON.parse(localStorage.getItem('orderData'));
            if (orderData) {
                document.getElementById('vpsId').innerText = orderData.vpsId || '';
                document.getElementById('vpsIp').innerText = orderData.ipAddress || '';
                document.getElementById('vpsPassword').innerText = orderData.password || '';
                
                productSection.style.display = 'none';
                paymentSection.style.display = 'none';
                processingSection.style.display = 'none';
                successSection.style.display = 'block';
                return true;
            }
        } catch (e) {
            console.error("Error parsing saved order data:", e);
        }
    }
    return false;
}

// Initialize footer
async function loadFooter() {
    const setContent = (id, property, value) => {
        const el = document.getElementById(id);
        if (el) el[property] = value;
    };
    
    try {
        const response = await fetch("/public/settings.json");
        if (!response.ok) {
            throw new Error(`Failed to load settings: ${response.statusText}`);
        }
        
        const settings = await response.json();
        
        setContent("credits", "textContent", `© ${new Date().getFullYear()} Powered by ${settings.creator || ""}`);
        document.getElementById("githubLink").href = settings.github || "#";
        document.getElementById("whatsappLink").href = settings.whatsapp || "#";
        document.getElementById("youtubeLink").href = settings.youtube || "#";
    } catch (error) {
        console.error("Error loading footer settings:", error);
        setContent("credits", "textContent", `© ${new Date().getFullYear()} Powered by Moontech`);
    }
}

// ===== PAYMENT PROOF FEATURE =====

// Setup Payment Proof Feature
function setupProofFeature() {
    // Button to open proof form
    if (sendProofBtn) {
        sendProofBtn.addEventListener('click', function() {
            openProofForm();
        });
    }
    
    // Cancel proof form button
    if (cancelProofBtn) {
        cancelProofBtn.addEventListener('click', function() {
            hideSection(sendProofSection);
            showSection(paymentSection);
        });
    }
    
    // Back to payment from success
    if (backToPaymentBtn) {
        backToPaymentBtn.addEventListener('click', function() {
            hideSection(proofSuccessSection);
            showSection(paymentSection);
        });
    }
    
    // Handle image preview
    if (proofImage) {
        proofImage.addEventListener('change', handleImagePreview);
    }
    
    // Handle proof form submission
    if (proofForm) {
        proofForm.addEventListener('submit', submitProofForm);
    }
}

// Open the proof form and populate transaction details
function openProofForm() {
    // Hide payment section
    hideSection(paymentSection);
    
    // Show proof form section
    showSection(sendProofSection);
    
    // Populate transaction details
    document.getElementById('proofProductName').textContent = document.getElementById('selectedProductName').textContent;
    document.getElementById('proofTrxId').textContent = document.getElementById('trxId').textContent;
    document.getElementById('proofAmount').textContent = document.getElementById('totalAmount').textContent;
    
    // Set current date
    const now = new Date();
    const formattedDate = now.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('proofDate').textContent = formattedDate;
}

// Handle image preview
function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Clear previous preview
    imagePreview.innerHTML = '';
    
    // Create image element
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = function() {
        URL.revokeObjectURL(this.src);
    }
    
    // Add to preview
    imagePreview.appendChild(img);
}

// Improved API upload function with better error handling
const uploadImageToUrl = async (buffer) => {
    try {
        // Make sure we're dealing with a proper Blob/File object
        if (!(buffer instanceof Blob) && !(buffer instanceof File)) {
            throw new Error('Invalid upload content: Buffer must be Blob or File');
        }
        
        const formData = new FormData();
        // Create a proper file object with name and type
        const fileToUpload = new File([buffer], 'payment-proof.png', {
            type: buffer.type || 'image/png'
        });
        
        formData.append('file', fileToUpload);
        
        console.log('Uploading file:', fileToUpload.name, 'Size:', fileToUpload.size, 'Type:', fileToUpload.type);
        
        const response = await fetch('https://i.supa.codes/api/upload', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Response Error:', response.status, errorText);
            throw new Error(`API Error (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Upload response:', data);
        
        // Check if response has the link property
        if (data && data.link) {
            return data.link;
        }
        throw new Error('No valid image URL in API response');
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
};

// Handle form submission
async function submitProofForm(e) {
    e.preventDefault();

    // Show loading overlay
    showLoading();
    
    try {
        // Get form data
        const customerName = document.getElementById('customerName').value;
        const contactInfo = document.getElementById('contactInfo').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const description = document.getElementById('description').value;
        const imageFile = document.getElementById('proofImage').files[0];
        const productName = document.getElementById('proofProductName').textContent;
        const trxId = document.getElementById('proofTrxId').textContent;
        const amount = document.getElementById('proofAmount').textContent;
        const date = document.getElementById('proofDate').textContent;
        
        // Upload image and get URL
        let imageUrl = null;
        if (imageFile) {
            try {
                imageUrl = await uploadImageToUrl(imageFile);
                console.log("Image uploaded successfully:", imageUrl);
            } catch (uploadError) {
                console.error("Failed to upload image:", uploadError);
                alert("Failed to upload image. Please try again.");
                hideLoading();
                return;
            }
        }
        
        // Prepare data for Telegram notification
        const proofData = {
            customerName,
            contactInfo,
            paymentMethod,
            description,
            productName,
            trxId,
            amount,
            date,
            imageUrl
        };
        
        // Send notification to Telegram
        await sendTelegramNotification(proofData);
        
        // Show success message
        hideSection(sendProofSection);
        showSection(proofSuccessSection);
    } catch (error) {
        console.error("Error submitting proof:", error);
        alert("Failed to submit payment proof. Please try again.");
    } finally {
        hideLoading();
    }
}
async function sendTelegramNotification(data) {
    try {
        const botToken = settings.TELEGRAM_BOT_TOKEN;
        const chatId = settings.TELEGRAM_CHAT_ID;

        const caption = `
<b>Moontech - Transaction</b>
    
<blockquote><b>Order Details:</b>
Product: ${data.productName}
Transaction ID: ${data.trxId}
Amount: ${data.amount}
Date: ${data.date}</blockquote>

<blockquote><b>Customer Details:</b>
<b>Name: <code>${data.customerName}</code></b>
Contact: <code>${data.contactInfo}</code>
Payment Method: <code>${data.paymentMethod}</code>
Description: <code>${data.description || '-'}</code></blockquote>

<i>This notification is generated automatically from the buy vps system</i>
`;

        console.log("Sending Telegram notification with photo...");

        if (!DEBUG_MODE) {
            const telegramUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;

            const bodyPayload = {
                chat_id: chatId,
                caption: caption,
                parse_mode: 'HTML',
            };

            if (data.imageUrl) {
                bodyPayload.photo = data.imageUrl;
            } else {
                bodyPayload.photo = "https://via.placeholder.com/500x300.png?text=No+Image"; 
                // Atau kamu bisa throw error kalau mau wajib ada foto
            }

            const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bodyPayload),
            });

            if (!response.ok) {
                throw new Error(`Telegram API Error: ${response.status}`);
            }

            const responseData = await response.json();
            console.log("Telegram response:", responseData);
        }

        saveProofSubmission(data);
        return true;
    } catch (error) {
        console.error("Error sending Telegram notification:", error);
        return true;
    }
}


// Save proof submission to localStorage
function saveProofSubmission(data) {
    try {
        // Get existing submissions or initialize empty array
        const existingSubmissions = JSON.parse(localStorage.getItem('proofSubmissions') || '[]');
        
        // Add timestamp to the data
        data.timestamp = new Date().toISOString();
        
        // Add to array
        existingSubmissions.push(data);
        
        // Save back to localStorage
        localStorage.setItem('proofSubmissions', JSON.stringify(existingSubmissions));
    } catch (e) {
        console.error("Error saving proof submission to localStorage:", e);
    }
}

// Helper functions to show/hide sections
function showSection(section) {
    if (section) section.style.display = 'block';
}

function hideSection(section) {
    if (section) section.style.display = 'none';
}

// Check for saved purchase on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if there's a saved purchase
    if (!checkForSavedPurchase()) {
        // If no saved purchase, show product section by default
        productSection.style.display = 'block';
        paymentSection.style.display = 'none';
        processingSection.style.display = 'none';
        successSection.style.display = 'none';
        sendProofSection.style.display = 'none';
        proofSuccessSection.style.display = 'none';
    }
});

// Function for resetting the UI when starting a new purchase
function resetUI() {
    hideSection(paymentSection);
    hideSection(processingSection);
    hideSection(successSection);
    hideSection(sendProofSection);
    hideSection(proofSuccessSection);
    showSection(productSection);
    
    // Clear selected products
    productCards.forEach(c => c.classList.remove('selected'));
    continueBtn.disabled = true;
    
    // Reset variables
    selectedProduct = null;
    selectedPrice = null;
    selectedRam = null;
    selectedCpu = null;
    selectedDisk = null;
    selectedRegion = null;
    selectedOs = null;
    paymentProcessed = false;
    
    // Clear any ongoing polling
    if (polling) {
        clearInterval(polling);
        polling = null;
    }
}

// Function to clear payment data
function clearPaymentData() {
    localStorage.removeItem('paymentSuccess');
    localStorage.removeItem('orderData');
}

// Add resize event listener to handle responsiveness
window.addEventListener('resize', function() {
    // You can add responsive adjustments here if needed
});

// Add error handling for network issues
window.addEventListener('offline', function() {
    alert('You are currently offline. Please check your internet connection to continue.');
});

// Expose functions that might be used by inline event handlers
window.resetUI = resetUI;
window.clearPaymentData = clearPaymentData;
window.openProofForm = openProofForm;