import jwt from "jsonwebtoken";
function CreateToken(id: string, duration: number) {
  const token = jwt.sign({ id }, process.env.TOKEN_SECRET!, {
    expiresIn: duration,
  });

  return token;
}

export default CreateToken;
