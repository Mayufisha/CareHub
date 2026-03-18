using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CareHub.Desktop.Services.Sync;
using CareHub.Models;
using CareHub.Services.Abstractions;

namespace CareHub.Services.Remote;

public sealed class StaffApiService : IStaffService
{
    private readonly HttpClient _http;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public StaffApiService(HttpClient http)
    {
        _http = http;
    }

    public async Task<List<StaffRecord>> GetAllAsync()
    {
        try
        {
            using var resp = await _http.GetAsync("api/staff");

            if (resp.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                throw new UnauthorizedAccessException("Not authorized to load staff.");

            resp.EnsureSuccessStatusCode();

            var payload = await resp.Content.ReadFromJsonAsync<List<StaffApiItem>>(JsonOptions)
                          ?? new List<StaffApiItem>();

            return payload
                .Select(MapToRecord)
                .OrderBy(x => x.EmployeeId, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
        catch (TaskCanceledException ex)
        {
            throw new OfflineException("API timeout (Load Staff).", ex);
        }
        catch (HttpRequestException ex) when (ex.StatusCode is null)
        {
            throw new OfflineException("API unreachable (Load Staff).", ex);
        }
    }

    public async Task SaveAllAsync(List<StaffRecord> staff)
    {
        if (staff == null) throw new ArgumentNullException(nameof(staff));

        foreach (var record in staff)
            await AddOrUpdateAsync(record);
    }

    public async Task AddOrUpdateAsync(StaffRecord staff)
    {
        if (staff == null) throw new ArgumentNullException(nameof(staff));
        if (string.IsNullOrWhiteSpace(staff.EmployeeId))
            throw new InvalidOperationException("Employee ID is required.");

        var username = staff.EmployeeId.Trim();
        var update = new UpdateStaffRequest
        {
            DisplayName = BuildDisplayName(staff),
            Role = string.IsNullOrWhiteSpace(staff.Role) ? "General CareStaff" : staff.Role.Trim()
        };

        try
        {
            var put = await _http.PutAsJsonAsync($"api/staff/{Uri.EscapeDataString(username)}", update);

            if (put.StatusCode == HttpStatusCode.NotFound)
            {
                // Desktop UI has no password field; create with a temporary default password.
                var create = new CreateStaffRequest
                {
                    Username = username,
                    Password = "ChangeMe123!",
                    DisplayName = update.DisplayName,
                    Role = update.Role ?? "General CareStaff"
                };

                var post = await _http.PostAsJsonAsync("api/staff", create);
                post.EnsureSuccessStatusCode();
                return;
            }

            put.EnsureSuccessStatusCode();
        }
        catch (TaskCanceledException ex)
        {
            throw new OfflineException("API timeout (Upsert Staff).", ex);
        }
        catch (HttpRequestException ex) when (ex.StatusCode is null)
        {
            throw new OfflineException("API unreachable (Upsert Staff).", ex);
        }
    }

    public async Task SetEnabledAsync(string employeeId, bool isEnabled)
    {
        if (string.IsNullOrWhiteSpace(employeeId))
            return;

        var username = employeeId.Trim();

        try
        {
            if (!isEnabled)
            {
                // API does not expose an enabled flag; map inactive to Observer role.
                var put = await _http.PutAsJsonAsync($"api/staff/{Uri.EscapeDataString(username)}", new UpdateStaffRequest
                {
                    Role = "Observer"
                });
                put.EnsureSuccessStatusCode();
                return;
            }

            var get = await _http.GetAsync($"api/staff/{Uri.EscapeDataString(username)}");
            if (get.StatusCode == HttpStatusCode.NotFound)
                return;
            get.EnsureSuccessStatusCode();

            var current = await get.Content.ReadFromJsonAsync<StaffApiItem>(JsonOptions);
            if (current == null)
                return;

            var currentRole = string.IsNullOrWhiteSpace(current.Role) ? "General CareStaff" : current.Role.Trim();
            if (!string.Equals(currentRole, "Observer", StringComparison.OrdinalIgnoreCase))
                return;

            var restore = await _http.PutAsJsonAsync($"api/staff/{Uri.EscapeDataString(username)}", new UpdateStaffRequest
            {
                Role = "General CareStaff"
            });
            restore.EnsureSuccessStatusCode();
        }
        catch (TaskCanceledException ex)
        {
            throw new OfflineException("API timeout (Set Staff Enabled).", ex);
        }
        catch (HttpRequestException ex) when (ex.StatusCode is null)
        {
            throw new OfflineException("API unreachable (Set Staff Enabled).", ex);
        }
    }

    private static StaffRecord MapToRecord(StaffApiItem item)
    {
        var (first, last) = SplitDisplayName(item.DisplayName, item.Username);
        var role = string.IsNullOrWhiteSpace(item.Role) ? "General CareStaff" : item.Role.Trim();

        return new StaffRecord
        {
            EmployeeId = item.Username ?? string.Empty,
            StaffFName = first,
            StaffLName = last,
            JobTitle = role,
            Department = string.Empty,
            EmploymentStatus = string.Empty,
            HourlyWage = 0m,
            ShiftPreference = string.Empty,
            Role = role,
            IsEnabled = !string.Equals(role, "Observer", StringComparison.OrdinalIgnoreCase),
            Compliance = new StaffCompliance()
        };
    }

    private static (string FirstName, string LastName) SplitDisplayName(string? displayName, string? fallback)
    {
        var source = (displayName ?? fallback ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(source))
            return ("", "");

        var parts = source.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 1)
            return (parts[0], "");

        return (parts[0], string.Join(" ", parts.Skip(1)));
    }

    private static string BuildDisplayName(StaffRecord staff)
    {
        var name = $"{staff.StaffFName} {staff.StaffLName}".Trim();
        return string.IsNullOrWhiteSpace(name) ? staff.EmployeeId.Trim() : name;
    }

    private sealed class StaffApiItem
    {
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    private sealed class UpdateStaffRequest
    {
        public string? DisplayName { get; set; }
        public string? Role { get; set; }
        public string? Password { get; set; }
    }

    private sealed class CreateStaffRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string Role { get; set; } = "General CareStaff";
    }
}
