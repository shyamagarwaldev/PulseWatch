import app from "./app";
import type { UserJwtPayload } from "./types/auth";

declare global {
  namespace Express {
    interface Request {
      userInfo: UserJwtPayload;
    }
  }
}
app.listen(3000, () => {
  console.log("Application is listening at 3000");
});
