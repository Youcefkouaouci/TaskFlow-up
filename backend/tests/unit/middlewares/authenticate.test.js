const jwt = require("jsonwebtoken");

jest.mock("../../../src/infrastructure/config/env", () => ({
  jwtSecret: "test-secret",
  jwtExpiresIn: "1h",
}));

const authenticate = require("../../../src/interfaces/http/middlewares/authenticate");

function makeRequest(authHeader) {
  return { headers: { authorization: authHeader } };
}

function makeResponse() {
  const response = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
}

describe("authenticate middleware", () => {
  it("401 si Authorization header absent", () => {
    const request = makeRequest(undefined);
    const response = makeResponse();
    const next = jest.fn();

    authenticate(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 si le header ne commence pas par Bearer", () => {
    const request = makeRequest("Basic abc123");
    const response = makeResponse();
    const next = jest.fn();

    authenticate(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 si token invalide", () => {
    const request = makeRequest("Bearer tokenbidon");
    const response = makeResponse();
    const next = jest.fn();

    authenticate(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 si token expiré", () => {
    // exp dans le passé = token immédiatement expiré
    const token = jwt.sign(
      { sub: "user1", exp: Math.floor(Date.now() / 1000) - 10 },
      "test-secret"
    );
    const request = makeRequest(`Bearer ${token}`);
    const response = makeResponse();
    const next = jest.fn();

    authenticate(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("appelle next() et injecte request.user avec un token valide", () => {
    const token = jwt.sign({ sub: "user1" }, "test-secret", { expiresIn: "1h" });
    const request = makeRequest(`Bearer ${token}`);
    const response = makeResponse();
    const next = jest.fn();

    authenticate(request, response, next);

    expect(next).toHaveBeenCalled();
    expect(request.user).toEqual({ id: "user1" });
  });
});
