using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Infrastructure.Persistence.Configurations.AuthenticationConfig;
using Application.Interfaces.Authentication;
using static Domain.Enums.UserEnum;
namespace Infrastructure.Authentication
{
    public class JWTTokenGenerator : IJWTTokenGenerator
	{
		private readonly JWTConfiguration _jwtOptions;

		public JWTTokenGenerator(JWTConfiguration jwtOptions)
		{
			_jwtOptions = jwtOptions ?? throw new ArgumentNullException(nameof(jwtOptions));
		}

		// Accept string role names from application layer
		public string GenerateToken(string userId, string email, IEnumerable<string> roles)
		{
			var tokenHandler = new JwtSecurityTokenHandler();
			var key = Encoding.UTF8.GetBytes(_jwtOptions.Key ?? string.Empty);
			var claimList = new List<Claim>
			{
				new Claim(JwtRegisteredClaimNames.Sub, userId),
				new Claim(ClaimTypes.NameIdentifier, userId),
				new Claim(JwtRegisteredClaimNames.Email, email)
			};

			// Add role claims from provided string names
			claimList.AddRange(roles.Where(r => !string.IsNullOrWhiteSpace(r)).Select(role => new Claim(ClaimTypes.Role, role)));

			var tokenDescriptor = new SecurityTokenDescriptor
			{
				Audience = _jwtOptions.Audience,
				Issuer = _jwtOptions.Issuer,
				Subject = new ClaimsIdentity(claimList),
				Expires = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpiresMinutes),
				SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
			};

			var token = tokenHandler.CreateToken(tokenDescriptor);
			return tokenHandler.WriteToken(token);
		}
	}
}
