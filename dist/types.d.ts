export interface VerkadaConfig {
    apiKey: string;
    orgId: string;
    region: "us" | "eu" | "au" | "oh";
}
export interface ApiTokenResponse {
    token: string;
}
export interface Camera {
    camera_id: string;
    name: string;
    site?: string;
    location?: string;
    model?: string;
    serial?: string;
    mac?: string;
    local_ip?: string;
    status?: string;
    firmware?: string;
}
export interface AccessUser {
    user_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    employee_id?: string;
    external_id?: string;
}
export interface Door {
    door_id: string;
    name?: string;
    site_id?: string;
}
export interface AccessGroup {
    group_id: string;
    name: string;
}
export interface AccessCard {
    card_id: string;
    card_number?: string;
    facility_code?: string;
    active?: boolean;
}
export interface AccessEvent {
    event_id?: string;
    user_id?: string;
    door_id?: string;
    event_type?: string;
    event_time?: number;
}
export interface Alert {
    camera_id?: string;
    created?: number;
    notification_type?: string;
    image_url?: string;
    video_url?: string;
    objects?: string[];
    person_label?: string;
    crowd_threshold?: number;
}
export interface LicensePlateOfInterest {
    license_plate_number: string;
    description?: string;
    created?: number;
}
export interface PersonOfInterest {
    person_id: string;
    label: string;
    created?: number;
    last_seen?: number;
}
export interface OrgUser {
    user_id?: string;
    external_id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
}
export interface AuditLog {
    timestamp?: string;
    user_email?: string;
    ip_address?: string;
    event_info?: Record<string, unknown>;
    device_info?: Record<string, unknown>;
}
export interface SensorReading {
    timestamp?: number;
    value?: number;
    unit?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    next_page_token?: string;
}
export interface ToolResult {
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: boolean;
}
//# sourceMappingURL=types.d.ts.map