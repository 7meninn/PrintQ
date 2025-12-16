import rateLimit from "express-rate-limit";

export const uploadLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: {
        error: "Too many upload attempts from this IP, please try again after 15 minutes."
    },
	standardHeaders: true,
	legacyHeaders: false,
});


export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requests per 15 mins
    message: { error: "Too many requests, please slow down." }
});