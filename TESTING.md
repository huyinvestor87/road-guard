# MVP Test Checklist

## Before driving

1. Open the app over HTTPS.
2. Tap **Bắt đầu cảnh báo** and allow precise location.
3. Confirm GPS shows **Hoạt động** and accuracy is reasonable.
4. Tap the sound button and verify Vietnamese speech is audible.
5. Use **Chạy chế độ demo** to verify UI, over-speed highlighting, and camera warnings.

## Road test

Use a passenger to operate the test phone. Do not interact with the app while driving.

Record:

- GPS accuracy
- displayed speed vs vehicle speedometer
- false camera warnings
- missed camera warnings
- incorrect road speed limits
- audio timing/volume

## Important

The current `data.js` contains synthetic demo entries only. It must be replaced with verified speed-limit and camera data before real-world warning accuracy can be evaluated.
