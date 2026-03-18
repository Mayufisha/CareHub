using System.Net;
using System.Net.Http.Json;
using CareHub.Desktop.Services.Sync;
using CareHub.Models;
using CareHub.Services.Abstractions;

namespace CareHub.Services.Remote;

public sealed class StaffApiService : IStaffService
{
    private readonly HttpClient _http;

    public StaffApiService(HttpClient http)
    {
        _http = http;
    }

    public async Task<List<StaffRecord>> GetAllAsync()
    {
        try
        {
            using var resp = await _http.GetAsync("api/staff/directory");

            if (resp.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                throw new UnauthorizedAccessException("Not authorized to load staff.");

            resp.EnsureSuccessStatusCode();
            return await resp.Content.ReadFromJsonAsync<List<StaffRecord>>() ?? new List<StaffRecord>();
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

        var employeeId = staff.EmployeeId.Trim();

        try
        {
            var put = await _http.PutAsJsonAsync($"api/staff/directory/{Uri.EscapeDataString(employeeId)}", staff);
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

        try
        {
            var staff = await GetAllAsync();
            var item = staff.FirstOrDefault(x =>
                x.EmployeeId.Equals(employeeId.Trim(), StringComparison.OrdinalIgnoreCase));
            if (item == null)
                return;

            item.IsEnabled = isEnabled;
            await AddOrUpdateAsync(item);
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
}
