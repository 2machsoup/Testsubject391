import { Router } from "express";
import multer from "multer";
import { ColumnMapping, DEFAULT_COLUMN_MAPPING, importCsv, clearImportedSales } from "../services/csvImport";

export const localPosRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "text/csv" && !file.originalname.toLowerCase().endsWith(".csv")) {
      cb(new Error("Only .csv files are accepted"));
      return;
    }
    cb(null, true);
  },
});

localPosRouter.get("/mapping/default", (_req, res) => {
  res.json({ mapping: DEFAULT_COLUMN_MAPPING });
});

localPosRouter.post("/import", upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No CSV file uploaded (expected field name 'file')" });
      return;
    }

    let mapping: ColumnMapping = DEFAULT_COLUMN_MAPPING;
    if (typeof req.body.mapping === "string") {
      mapping = { ...DEFAULT_COLUMN_MAPPING, ...JSON.parse(req.body.mapping) };
    }

    const result = importCsv(req.file.buffer, mapping);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

localPosRouter.delete("/", (_req, res) => {
  clearImportedSales();
  res.json({ ok: true });
});
