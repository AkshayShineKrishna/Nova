class AuthException(Exception):
    """Base exception for auth service"""
    pass


class UserAlreadyExistsException(AuthException):
    pass


class InvalidCredentialsException(AuthException):
    pass
