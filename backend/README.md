Risk Matrix Image

Place the risk matrix image used in the report at backend/public/risk-matrix.png (or run the helper):

- Copy manually: cp /path/to/your/image.png backend/public/risk-matrix.png
- Or use helper: node backend/scripts/install-risk-matrix.js /path/to/your/image.png

The report generator will look for the image in ./public first, then backend/src/templates as a fallback.
